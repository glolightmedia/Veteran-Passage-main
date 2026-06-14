from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import logging

from utils.auth import get_current_user
from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/blog", tags=["blog"])
db = None


def set_db(database):
    global db
    db = database


CATEGORIES = ["benefits", "dd214", "jobs", "business", "housing", "tools", "guides", "news"]
ARTICLE_TYPES = ["guide", "faq", "comparison", "best-of", "state-seo", "roundup", "partner-spotlight", "news"]


# ─── PUBLIC ENDPOINTS ───

@router.get("/articles")
async def list_articles(category: str = Query(None), page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=50)):
    query = {"status": "published"}
    if category and category != "all":
        query["category"] = category
    skip = (page - 1) * limit
    total = await db.blog_articles.count_documents(query)
    cursor = db.blog_articles.find(query, {
        "content": 0, "affiliate_slots": 0, "cta_config": 0, "seo": 0
    }).sort("published_at", -1).skip(skip).limit(limit)
    articles = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        articles.append(a)
    return {"articles": articles, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/articles/{slug}")
async def get_article(slug: str):
    article = await db.blog_articles.find_one({"slug": slug, "status": "published"})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Track view
    await db.blog_articles.update_one({"_id": article["_id"]}, {"$inc": {"views": 1}})
    article["id"] = str(article.pop("_id"))
    return article


@router.get("/featured")
async def get_featured():
    cursor = db.blog_articles.find({"status": "published", "featured": True}, {"content": 0}).sort("published_at", -1).limit(6)
    articles = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        articles.append(a)
    return {"articles": articles}


@router.get("/by-topic/{topic}")
async def get_by_topic(topic: str, limit: int = Query(6)):
    cursor = db.blog_articles.find({"status": "published", "category": topic}, {"content": 0}).sort("published_at", -1).limit(limit)
    articles = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        articles.append(a)
    return {"articles": articles}


# ─── ARTICLE CTA/AFFILIATE CLICK TRACKING ───

@router.post("/articles/{slug}/track")
async def track_article_event(request: Request, slug: str):
    body = await request.json()
    event_type = body.get("type", "")  # cta_click, affiliate_click, scroll_depth
    await db.blog_events.insert_one({
        "slug": slug,
        "type": event_type,
        "metadata": body.get("metadata", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Update article counters
    if event_type == "cta_click":
        await db.blog_articles.update_one({"slug": slug}, {"$inc": {"cta_clicks": 1}})
    elif event_type == "affiliate_click":
        await db.blog_articles.update_one({"slug": slug}, {"$inc": {"affiliate_clicks": 1}})

    return {"ok": True}


# ─── ADMIN ENDPOINTS ───

@router.get("/admin/articles")
async def admin_list_articles(request: Request, status: str = Query("all"), category: str = Query(None), article_type: str = Query(None)):
    await require_role(request, db, ["admin", "superadmin"])
    query = {}
    if status != "all":
        query["status"] = status
    if category:
        query["category"] = category
    if article_type:
        query["article_type"] = article_type

    cursor = db.blog_articles.find(query, {"content": 0}).sort("created_at", -1)
    articles = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        articles.append(a)
    return {"articles": articles, "total": len(articles)}


@router.post("/admin/articles")
async def create_article(request: Request):
    admin = await require_role(request, db, ["admin", "superadmin"])
    body = await request.json()

    slug = body.get("slug", "").lower().strip().replace(" ", "-")
    if not slug:
        slug = body.get("title", "untitled").lower().replace(" ", "-").replace("?", "").replace(":", "")[:80]

    existing = await db.blog_articles.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")

    doc = {
        "title": body.get("title", ""),
        "subtitle": body.get("subtitle", ""),
        "slug": slug,
        "category": body.get("category", "guides"),
        "article_type": body.get("article_type", "guide"),
        "tags": body.get("tags", []),
        "excerpt": body.get("excerpt", ""),
        "who_for": body.get("who_for", ""),
        "content": body.get("content", ""),
        "faq": body.get("faq", []),
        "featured_image": body.get("featured_image", ""),
        "read_time": body.get("read_time", "5 min"),
        # SEO
        "seo": {
            "title": body.get("seo_title", body.get("title", "")),
            "meta_description": body.get("meta_description", ""),
            "focus_keyword": body.get("focus_keyword", ""),
            "secondary_keywords": body.get("secondary_keywords", []),
            "canonical": body.get("canonical", ""),
            "og_title": body.get("og_title", ""),
            "og_description": body.get("og_description", ""),
            "noindex": body.get("noindex", False),
            "faq_schema": body.get("faq_schema", True),
            "article_schema": body.get("article_schema", True),
        },
        # CTAs
        "cta_config": {
            "top_cta": body.get("top_cta", True),
            "mid_cta": body.get("mid_cta", True),
            "bottom_cta": body.get("bottom_cta", True),
            "cta_type": body.get("cta_type", "decoder"),
            "cta_text": body.get("cta_text", ""),
            "cta_url": body.get("cta_url", ""),
        },
        # Affiliates
        "affiliate_enabled": body.get("affiliate_enabled", False),
        "affiliate_disclosure": body.get("affiliate_disclosure", False),
        "affiliate_slots": body.get("affiliate_slots", []),
        # Publishing
        "author": body.get("author", admin.get("full_name", "Veteran Passage Team")),
        "reviewer": body.get("reviewer", ""),
        "status": body.get("status", "draft"),
        "featured": body.get("featured", False),
        "topic_hub": body.get("topic_hub", ""),
        "related_articles": body.get("related_articles", []),
        "internal_links": body.get("internal_links", []),
        # Tracking
        "views": 0,
        "cta_clicks": 0,
        "affiliate_clicks": 0,
        "published_at": datetime.now(timezone.utc).isoformat() if body.get("status") == "published" else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.blog_articles.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.put("/admin/articles/{article_id}")
async def update_article(request: Request, article_id: str):
    await require_role(request, db, ["admin", "superadmin"])
    body = await request.json()
    update = {k: v for k, v in body.items() if k not in ["id", "_id"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update.get("status") == "published":
        existing = await db.blog_articles.find_one({"_id": ObjectId(article_id)})
        if existing and not existing.get("published_at"):
            update["published_at"] = datetime.now(timezone.utc).isoformat()

    await db.blog_articles.update_one({"_id": ObjectId(article_id)}, {"$set": update})
    updated = await db.blog_articles.find_one({"_id": ObjectId(article_id)})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.delete("/admin/articles/{article_id}")
async def delete_article(request: Request, article_id: str):
    await require_role(request, db, ["admin", "superadmin"])
    await db.blog_articles.delete_one({"_id": ObjectId(article_id)})
    return {"message": "Article deleted"}


@router.get("/admin/analytics")
async def blog_analytics(request: Request):
    await require_role(request, db, ["admin", "superadmin"])

    total = await db.blog_articles.count_documents({})
    published = await db.blog_articles.count_documents({"status": "published"})
    drafts = await db.blog_articles.count_documents({"status": "draft"})

    # Top articles by views
    top_views = await db.blog_articles.find({"status": "published"}).sort("views", -1).limit(5).to_list(5)
    for t in top_views:
        t["id"] = str(t.pop("_id"))
        t.pop("content", None)

    # Top by CTA clicks
    top_cta = await db.blog_articles.find({"status": "published", "cta_clicks": {"$gt": 0}}).sort("cta_clicks", -1).limit(5).to_list(5)
    for t in top_cta:
        t["id"] = str(t.pop("_id"))
        t.pop("content", None)

    # Total events
    total_cta = 0
    total_aff = 0
    async for a in db.blog_articles.find({"status": "published"}, {"cta_clicks": 1, "affiliate_clicks": 1}):
        total_cta += a.get("cta_clicks", 0)
        total_aff += a.get("affiliate_clicks", 0)

    # Missing SEO
    missing_seo = await db.blog_articles.count_documents({"status": "published", "$or": [
        {"seo.meta_description": ""}, {"seo.focus_keyword": ""}
    ]})

    return {
        "total": total, "published": published, "drafts": drafts,
        "total_cta_clicks": total_cta, "total_affiliate_clicks": total_aff,
        "missing_seo": missing_seo,
        "top_by_views": [{"title": t["title"], "slug": t["slug"], "views": t.get("views", 0)} for t in top_views],
        "top_by_cta": [{"title": t["title"], "slug": t["slug"], "cta_clicks": t.get("cta_clicks", 0)} for t in top_cta],
    }


@router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES, "article_types": ARTICLE_TYPES}

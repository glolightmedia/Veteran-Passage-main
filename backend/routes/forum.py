from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import logging

from utils.auth import get_current_user
from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/forum", tags=["forum"])
db = None


def set_db(database):
    global db
    db = database


CATEGORIES = [
    {"id": "general", "name": "General Discussion", "description": "Open conversations for all veterans", "icon": "MessageSquare"},
    {"id": "benefits", "name": "Benefits & Claims", "description": "VA benefits, claims, and discharge upgrades", "icon": "Shield"},
    {"id": "careers", "name": "Careers & Employment", "description": "Job hunting, interviews, and career transitions", "icon": "Briefcase"},
    {"id": "business", "name": "Entrepreneurship", "description": "Starting and growing veteran-owned businesses", "icon": "Rocket"},
    {"id": "wellness", "name": "Health & Wellness", "description": "Mental health, fitness, and family support", "icon": "Heart"},
    {"id": "stories", "name": "Success Stories", "description": "Share your wins and inspire others", "icon": "Star"},
]


@router.get("/categories")
async def get_categories(request: Request):
    await get_current_user(request, db)
    # Get post counts per category
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    counts = {r["_id"]: r["count"] for r in await db.forum_posts.aggregate(pipeline).to_list(20)}
    cats = []
    for c in CATEGORIES:
        cats.append({**c, "post_count": counts.get(c["id"], 0)})
    return {"categories": cats}


@router.get("/posts")
async def list_posts(
    request: Request,
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    await get_current_user(request, db)
    query = {}
    if category and category != "all":
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]

    sort_field = "created_at" if sort == "newest" else "upvotes"
    sort_dir = -1

    skip = (page - 1) * limit
    total = await db.forum_posts.count_documents(query)
    cursor = db.forum_posts.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit)
    posts = []
    async for p in cursor:
        p["id"] = str(p.pop("_id"))
        # Get reply count
        p["reply_count"] = await db.forum_replies.count_documents({"post_id": p["id"]})
        posts.append(p)

    return {"posts": posts, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/posts")
async def create_post(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    title = body.get("title", "").strip()
    content = body.get("content", "").strip()
    category = body.get("category", "general")

    if not title or len(title) < 3:
        raise HTTPException(status_code=400, detail="Title must be at least 3 characters")
    if not content or len(content) < 10:
        raise HTTPException(status_code=400, detail="Content must be at least 10 characters")

    doc = {
        "title": title,
        "content": content,
        "category": category,
        "author_id": user["id"],
        "author_name": user.get("full_name", "Anonymous"),
        "author_branch": user.get("branch"),
        "upvotes": 0,
        "upvoted_by": [],
        "pinned": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.forum_posts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    doc["reply_count"] = 0
    return doc


@router.get("/posts/{post_id}")
async def get_post(request: Request, post_id: str):
    await get_current_user(request, db)
    post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post["id"] = str(post.pop("_id"))

    # Get replies
    cursor = db.forum_replies.find({"post_id": post_id}).sort("created_at", 1)
    replies = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        replies.append(r)

    post["replies"] = replies
    post["reply_count"] = len(replies)
    return post


@router.post("/posts/{post_id}/reply")
async def create_reply(request: Request, post_id: str):
    user = await get_current_user(request, db)
    body = await request.json()
    content = body.get("content", "").strip()

    if not content or len(content) < 5:
        raise HTTPException(status_code=400, detail="Reply must be at least 5 characters")

    post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    doc = {
        "post_id": post_id,
        "content": content,
        "author_id": user["id"],
        "author_name": user.get("full_name", "Anonymous"),
        "author_branch": user.get("branch"),
        "upvotes": 0,
        "upvoted_by": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.forum_replies.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)

    await db.forum_posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return doc


@router.post("/posts/{post_id}/upvote")
async def upvote_post(request: Request, post_id: str):
    user = await get_current_user(request, db)
    post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    upvoted_by = post.get("upvoted_by", [])
    if user["id"] in upvoted_by:
        await db.forum_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$pull": {"upvoted_by": user["id"]}, "$inc": {"upvotes": -1}}
        )
        return {"upvoted": False, "upvotes": post["upvotes"] - 1}
    else:
        await db.forum_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$addToSet": {"upvoted_by": user["id"]}, "$inc": {"upvotes": 1}}
        )
        return {"upvoted": True, "upvotes": post["upvotes"] + 1}


@router.delete("/posts/{post_id}")
async def delete_post(request: Request, post_id: str):
    user = await get_current_user(request, db)
    post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["author_id"] != user["id"] and user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.forum_posts.delete_one({"_id": ObjectId(post_id)})
    await db.forum_replies.delete_many({"post_id": post_id})
    return {"message": "Post deleted"}


@router.post("/posts/{post_id}/pin")
async def toggle_pin(request: Request, post_id: str):
    user = await require_role(request, db, ["admin", "moderator"])
    post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    new_pinned = not post.get("pinned", False)
    await db.forum_posts.update_one({"_id": ObjectId(post_id)}, {"$set": {"pinned": new_pinned}})
    return {"pinned": new_pinned}

from fastapi import APIRouter, Request
from datetime import datetime, timezone
from bson import ObjectId
import aiohttp
import logging

from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/link-health", tags=["link-health"])
db = None


def set_db(database):
    global db
    db = database


@router.post("/check")
async def run_link_check(request: Request):
    admin = await require_role(request, db, ["admin", "superadmin"])

    # Gather all URLs to check
    urls_to_check = []

    # Job apply URLs
    async for job in db.jobs_v2.find({"status": "active", "apply_url": {"$ne": ""}}):
        urls_to_check.append({
            "url": job.get("apply_url", ""),
            "source": "job",
            "source_id": str(job["_id"]),
            "source_name": job.get("title", "")
        })

    # Resource URLs
    async for res in db.resources.find({"status": "approved"}):
        if res.get("url"):
            urls_to_check.append({
                "url": res["url"],
                "source": "resource",
                "source_id": str(res["_id"]),
                "source_name": res.get("name", "")
            })

    # Partner websites
    async for partner in db.partner_directory.find({"active": True}):
        if partner.get("website"):
            urls_to_check.append({
                "url": partner["website"],
                "source": "partner",
                "source_id": str(partner.get("_id", "")),
                "source_name": partner.get("organization_name", "")
            })

    results = {"checked": 0, "healthy": 0, "broken": 0, "errors": []}

    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
        for item in urls_to_check:
            url = item["url"]
            if not url or not url.startswith("http"):
                continue
            results["checked"] += 1
            try:
                async with session.head(url, allow_redirects=True) as resp:
                    status = resp.status
                    is_broken = status >= 400
            except Exception as e:
                status = 0
                is_broken = True

            if is_broken:
                results["broken"] += 1
                results["errors"].append({
                    "url": url,
                    "status": status,
                    "source": item["source"],
                    "source_name": item["source_name"]
                })
                # Upsert broken link record
                await db.broken_links.update_one(
                    {"url": url},
                    {"$set": {
                        "url": url, "status": "broken", "http_status": status,
                        "source": item["source"], "source_id": item["source_id"],
                        "source_name": item["source_name"],
                        "last_checked": datetime.now(timezone.utc).isoformat(),
                        "fail_count": 1
                    },
                    "$inc": {"fail_count": 1}},
                    upsert=True
                )
            else:
                results["healthy"] += 1
                # Remove from broken if it was there
                await db.broken_links.delete_one({"url": url})

    await db.activity_logs.insert_one({
        "user_id": admin["id"],
        "action": "link_health_check",
        "metadata": {"checked": results["checked"], "broken": results["broken"]},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return results


@router.get("/broken")
async def get_broken_links(request: Request):
    await require_role(request, db, ["admin", "superadmin"])
    cursor = db.broken_links.find({"status": "broken"}).sort("last_checked", -1)
    links = []
    async for l in cursor:
        l["id"] = str(l.pop("_id"))
        links.append(l)
    return {"broken_links": links, "total": len(links)}


@router.delete("/broken/{link_id}")
async def dismiss_broken_link(request: Request, link_id: str):
    await require_role(request, db, ["admin", "superadmin"])
    await db.broken_links.delete_one({"_id": ObjectId(link_id)})
    return {"message": "Dismissed"}

from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/donate", tags=["donate"])
db = None


def set_db(database):
    global db
    db = database


SUGGESTED_AMOUNTS = [10, 25, 50, 100]


@router.post("/checkout")
async def create_donation_checkout(request: Request):
    import stripe
    body = await request.json()
    amount = body.get("amount")
    recurring = body.get("recurring", True)
    donor_name = body.get("name", "Anonymous")
    donor_email = body.get("email", "")

    if not amount or float(amount) < 1:
        raise HTTPException(status_code=400, detail="Minimum donation is $1")

    amount_cents = int(float(amount) * 100)
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe.api_key = api_key

    origin_url = request.headers.get("X-Origin-URL", os.environ.get("FRONTEND_URL", str(request.base_url).rstrip("/")))
    success_url = f"{origin_url}/donate/thank-you?session_id={{CHECKOUT_SESSION_ID}}&amount={amount}&recurring={'true' if recurring else 'false'}"
    cancel_url = f"{origin_url}/donate"

    metadata = {
        "type": "donation",
        "donor_name": donor_name,
        "recurring": str(recurring),
        "amount": str(amount)
    }

    try:
        if recurring:
            session = stripe.checkout.Session.create(
                mode="subscription",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Monthly Donation to Veteran Passage",
                            "description": f"${amount}/month recurring donation supporting veterans of all discharges"
                        },
                        "unit_amount": amount_cents,
                        "recurring": {"interval": "month"}
                    },
                    "quantity": 1
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
                customer_email=donor_email if donor_email else None
            )
        else:
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "One-Time Donation to Veteran Passage",
                            "description": f"${amount} one-time donation supporting veterans of all discharges"
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
                customer_email=donor_email if donor_email else None
            )

        # Record donation attempt
        await db.donations.insert_one({
            "session_id": session.id,
            "donor_name": donor_name,
            "donor_email": donor_email,
            "amount": float(amount),
            "recurring": recurring,
            "status": "pending",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"url": session.url, "session_id": session.id}

    except Exception as e:
        logger.error(f"Stripe donation error: {e}")
        raise HTTPException(status_code=500, detail="Payment processing error. Please try again.")


@router.get("/status/{session_id}")
async def check_donation_status(request: Request, session_id: str):
    import stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe.api_key = api_key

    donation = await db.donations.find_one({"session_id": session_id})

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        status = session.payment_status

        if status == "paid" and donation and donation.get("status") != "paid":
            await db.donations.update_one(
                {"session_id": session_id},
                {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )

        return {
            "status": session.status,
            "payment_status": status,
            "amount": donation.get("amount") if donation else None,
            "recurring": donation.get("recurring") if donation else None
        }
    except Exception as e:
        logger.error(f"Donation status error: {e}")
        return {"status": "unknown", "payment_status": "unknown"}


@router.get("/stats")
async def donation_stats(request: Request):
    total_donations = await db.donations.count_documents({"status": "paid"})
    total_amount = 0
    async for d in db.donations.find({"status": "paid"}):
        total_amount += d.get("amount", 0)
    recurring_count = await db.donations.count_documents({"status": "paid", "recurring": True})

    return {
        "total_donations": total_donations,
        "total_amount": total_amount,
        "recurring_donors": recurring_count
    }

"""
Test Suite for 3 New Features:
1. DD-214 Decoder - RE code lookup, narrative translator, upgrade board info, full analysis
2. Skill Barter System - skills profile, matching, barter requests
3. Partners' Lodge - partner application, admin approval, public directory
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
CUSTOMER_EMAIL = "testvet@test.com"
CUSTOMER_PASSWORD = "TestPass123"


class TestDD214Decoder:
    """DD-214 Decoder feature tests - RE codes, narrative reasons, upgrade boards, analysis"""
    
    def test_get_all_re_codes(self):
        """GET /api/dd214/re-codes returns all 9 RE codes"""
        response = requests.get(f"{BASE_URL}/api/dd214/re-codes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "codes" in data
        codes = data["codes"]
        # Should have 9 RE codes
        expected_codes = ["RE-1", "RE-1A", "RE-2", "RE-2B", "RE-3", "RE-3B", "RE-3P", "RE-4", "RE-4R"]
        for code in expected_codes:
            assert code in codes, f"Missing RE code: {code}"
        print(f"PASS: All 9 RE codes returned: {list(codes.keys())}")
    
    def test_decode_re_code_re3(self):
        """GET /api/dd214/re-codes/RE-3 returns decoded info with tier, meaning, upgrade_likelihood"""
        response = requests.get(f"{BASE_URL}/api/dd214/re-codes/RE-3")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert data["code"] == "RE-3"
        assert "tier" in data
        assert data["tier"] == "yellow"
        assert "meaning" in data
        assert "upgrade_likelihood" in data
        assert "description" in data
        print(f"PASS: RE-3 decoded - tier: {data['tier']}, meaning: {data['meaning'][:50]}...")
    
    def test_decode_re_code_not_found(self):
        """GET /api/dd214/re-codes/INVALID returns not found"""
        response = requests.get(f"{BASE_URL}/api/dd214/re-codes/INVALID")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        print("PASS: Invalid RE code returns found=False")
    
    def test_get_all_narrative_reasons(self):
        """GET /api/dd214/narrative-reasons returns all 12 narrative reasons"""
        response = requests.get(f"{BASE_URL}/api/dd214/narrative-reasons")
        assert response.status_code == 200
        data = response.json()
        assert "reasons" in data
        reasons = data["reasons"]
        # Should have 12 narrative reasons
        expected_reasons = ["misconduct", "pattern of misconduct", "drug abuse", "alcohol abuse", 
                          "personality disorder", "adjustment disorder", "in lieu of court martial",
                          "commission of a serious offense", "unfitness", "homosexual conduct", 
                          "parenthood", "entry level performance and conduct"]
        for reason in expected_reasons:
            assert reason in reasons, f"Missing narrative reason: {reason}"
        print(f"PASS: All 12 narrative reasons returned")
    
    def test_get_upgrade_board_army(self):
        """GET /api/dd214/upgrade-board?branch=Army returns board info"""
        response = requests.get(f"{BASE_URL}/api/dd214/upgrade-board?branch=Army")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert data["branch"] == "Army"
        assert "name" in data
        assert "Army Discharge Review Board" in data["name"]
        assert "url" in data
        assert "timeline" in data
        print(f"PASS: Army board info - {data['name']}, timeline: {data['timeline']}")
    
    def test_get_upgrade_board_invalid(self):
        """GET /api/dd214/upgrade-board?branch=Invalid returns not found"""
        response = requests.get(f"{BASE_URL}/api/dd214/upgrade-board?branch=Invalid")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == False
        print("PASS: Invalid branch returns found=False")
    
    def test_analyze_dd214_authenticated(self, customer_session):
        """POST /api/dd214/analyze returns full analysis with next_steps (requires auth)"""
        response = customer_session.post(f"{BASE_URL}/api/dd214/analyze", json={
            "re_code": "RE-3",
            "narrative_reason": "misconduct",
            "branch": "Army"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "re_code" in data
        assert "narrative" in data
        assert "discharge_board" in data
        assert "upgrade_recommended" in data
        assert "next_steps" in data
        assert isinstance(data["next_steps"], list)
        assert len(data["next_steps"]) > 0
        print(f"PASS: DD-214 analysis returned - upgrade_recommended: {data['upgrade_recommended']}, next_steps: {len(data['next_steps'])}")


class TestSkillBarter:
    """Skill Barter System tests - profile, matches, requests"""
    
    def test_update_barter_profile(self, customer_session):
        """PUT /api/barter/profile sets skills_have and skills_need"""
        response = customer_session.put(f"{BASE_URL}/api/barter/profile", json={
            "skills_have": ["Auto Repair", "Carpentry", "Welding"],
            "skills_need": ["Resume Writing", "Tax Preparation"],
            "active": True,
            "bio": "Army veteran looking to trade skills"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASS: Barter profile updated - {data['message']}")
    
    def test_get_barter_matches(self, customer_session):
        """GET /api/barter/matches returns skill matches"""
        response = customer_session.get(f"{BASE_URL}/api/barter/matches")
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        # Matches may be empty if no other users have matching skills
        print(f"PASS: Barter matches returned - {len(data['matches'])} matches found")
    
    def test_send_barter_request_no_target(self, customer_session):
        """POST /api/barter/request without target_id returns 400"""
        response = customer_session.post(f"{BASE_URL}/api/barter/request", json={
            "message": "Let's trade skills!"
        })
        assert response.status_code == 400
        print("PASS: Barter request without target_id returns 400")
    
    def test_send_barter_request_self(self, customer_session, customer_user_id):
        """POST /api/barter/request to self returns 400"""
        response = customer_session.post(f"{BASE_URL}/api/barter/request", json={
            "target_id": customer_user_id,
            "message": "Testing self-request"
        })
        assert response.status_code == 400
        data = response.json()
        assert "yourself" in data.get("detail", "").lower()
        print("PASS: Barter request to self returns 400")
    
    def test_get_barter_requests(self, customer_session):
        """GET /api/barter/requests returns requests"""
        response = customer_session.get(f"{BASE_URL}/api/barter/requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"PASS: Barter requests returned - {len(data['requests'])} requests")


class TestPartnersLodge:
    """Partners' Lodge tests - application, admin approval, directory"""
    
    def test_get_partner_types(self):
        """GET /api/partners/types returns 7 partner types"""
        response = requests.get(f"{BASE_URL}/api/partners/types")
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        types = data["types"]
        assert len(types) == 7, f"Expected 7 partner types, got {len(types)}"
        type_ids = [t["id"] for t in types]
        expected_types = ["legal_aid", "employer", "school", "grant_provider", "healthcare", "housing", "nonprofit"]
        for t in expected_types:
            assert t in type_ids, f"Missing partner type: {t}"
        print(f"PASS: All 7 partner types returned: {type_ids}")
    
    def test_submit_partner_application_no_auth(self):
        """POST /api/partners/apply submits partner application (no auth required)"""
        unique_email = f"test_partner_{int(time.time())}@example.org"
        response = requests.post(f"{BASE_URL}/api/partners/apply", json={
            "organization_name": "Test Veterans Legal Aid",
            "contact_name": "John Doe",
            "contact_email": unique_email,
            "phone": "555-123-4567",
            "website": "https://testvla.org",
            "partner_type": "legal_aid",
            "description": "Free legal services for veterans seeking discharge upgrades",
            "services_offered": ["Discharge upgrade", "VA claims"],
            "states_served": ["California", "Texas"],
            "accepts_oth": True,
            "accepts_bcd": True,
            "pro_bono": True
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "application" in data
        assert data["application"]["status"] == "pending"
        print(f"PASS: Partner application submitted - {data['message']}")
        return data["application"]["id"]
    
    def test_submit_partner_application_missing_fields(self):
        """POST /api/partners/apply with missing required fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/partners/apply", json={
            "organization_name": "Incomplete Org"
            # Missing required fields
        })
        assert response.status_code == 400
        print("PASS: Partner application with missing fields returns 400")
    
    def test_submit_partner_application_invalid_type(self):
        """POST /api/partners/apply with invalid partner_type returns 400"""
        response = requests.post(f"{BASE_URL}/api/partners/apply", json={
            "organization_name": "Test Org",
            "contact_name": "Jane Doe",
            "contact_email": "invalid_type@test.org",
            "partner_type": "invalid_type",
            "description": "Test description"
        })
        assert response.status_code == 400
        data = response.json()
        assert "Invalid partner type" in data.get("detail", "")
        print("PASS: Partner application with invalid type returns 400")
    
    def test_get_partner_applications_admin_only(self, admin_session):
        """GET /api/partners/applications returns pending apps (admin only)"""
        response = admin_session.get(f"{BASE_URL}/api/partners/applications?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
        assert "total" in data
        print(f"PASS: Admin can view partner applications - {data['total']} pending")
        return data["applications"]
    
    def test_get_partner_applications_customer_forbidden(self, customer_session):
        """GET /api/partners/applications as customer returns 403"""
        response = customer_session.get(f"{BASE_URL}/api/partners/applications")
        assert response.status_code == 403
        print("PASS: Customer cannot view partner applications (403)")
    
    def test_approve_partner_application(self, admin_session):
        """PUT /api/partners/applications/{id}/approve approves and adds to directory"""
        # First submit a new application
        unique_email = f"approve_test_{int(time.time())}@example.org"
        submit_response = requests.post(f"{BASE_URL}/api/partners/apply", json={
            "organization_name": "Approval Test Org",
            "contact_name": "Test Admin",
            "contact_email": unique_email,
            "partner_type": "employer",
            "description": "Veteran-friendly employer for testing"
        })
        assert submit_response.status_code == 200
        app_id = submit_response.json()["application"]["id"]
        
        # Approve the application
        approve_response = admin_session.put(f"{BASE_URL}/api/partners/applications/{app_id}/approve")
        assert approve_response.status_code == 200
        data = approve_response.json()
        assert "approved" in data["message"].lower()
        print(f"PASS: Partner application approved - {data['message']}")
    
    def test_get_partner_directory(self):
        """GET /api/partners/directory returns active partners"""
        response = requests.get(f"{BASE_URL}/api/partners/directory")
        assert response.status_code == 200
        data = response.json()
        assert "partners" in data
        assert "total" in data
        print(f"PASS: Partner directory returned - {data['total']} active partners")
    
    def test_get_partner_directory_filtered(self):
        """GET /api/partners/directory?partner_type=legal_aid filters by type"""
        response = requests.get(f"{BASE_URL}/api/partners/directory?partner_type=legal_aid")
        assert response.status_code == 200
        data = response.json()
        assert "partners" in data
        # All returned partners should be legal_aid type
        for partner in data["partners"]:
            assert partner["partner_type"] == "legal_aid"
        print(f"PASS: Partner directory filtered by type - {data['total']} legal_aid partners")


# Fixtures
@pytest.fixture(scope="module")
def admin_session():
    """Create authenticated admin session"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return session


@pytest.fixture(scope="module")
def customer_session():
    """Create authenticated customer session"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Customer login failed: {response.text}")
    return session


@pytest.fixture(scope="module")
def customer_user_id(customer_session):
    """Get customer user ID"""
    response = customer_session.get(f"{BASE_URL}/api/auth/me")
    if response.status_code != 200:
        pytest.skip("Failed to get customer user info")
    return response.json()["id"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

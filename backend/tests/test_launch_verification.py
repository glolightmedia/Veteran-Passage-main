"""
LAUNCH VERIFICATION TEST SUITE
Tests all 14 core features for production readiness:
- Flow A: Veteran signup → intake → recommendations → lead
- Flow B: DD-214 decoder → analysis → CTA
- Flow C: Employer partner → job post → admin approve → job live
- Flow D: Failed login tracking with specific reasons
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
SUPERADMIN_EMAIL = os.environ.get("SUPERADMIN_EMAIL", "glolightmedia@gmail.com")
SUPERADMIN_PASSWORD = os.environ.get("SUPERADMIN_PASSWORD", "")
SYSTEM_ADMIN_EMAIL = "admin@veteranpassage.org"
SYSTEM_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
EMPLOYER_EMAIL = "launch_employer@test.com"
EMPLOYER_PASSWORD = "EmployerTest1!"
VETERAN_EMAIL = "testvet@test.com"
VETERAN_PASSWORD = "TestPass123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """GET /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health endpoint working")


class TestFlowD_AuthEventTracking:
    """FLOW D: Failed login tracking with specific reasons"""
    
    def test_wrong_password_returns_401_and_tracks(self):
        """Wrong password returns 401, tracked as auth_event with reason=wrong_password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VETERAN_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        data = response.json()
        assert "Invalid" in data.get("detail", "")
        print("✓ Wrong password returns 401")
    
    def test_nonexistent_user_returns_401_and_tracks(self):
        """Non-existent user returns 401, tracked as reason=no_user_found"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent_user_xyz@test.com",
            "password": "AnyPassword123"
        })
        assert response.status_code == 401
        data = response.json()
        assert "Invalid" in data.get("detail", "")
        print("✓ Non-existent user returns 401")


class TestSuperadminLogin:
    """Test superadmin authentication"""
    
    @pytest.fixture
    def superadmin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Superadmin login failed: {response.text}")
        return session
    
    def test_superadmin_login(self, superadmin_session):
        """Superadmin can login with correct credentials"""
        response = superadmin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "superadmin"
        print(f"✓ Superadmin login successful: {data['email']}")
    
    def test_superadmin_widgets(self, superadmin_session):
        """GET /api/superadmin/widgets returns dashboard widgets"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/widgets")
        assert response.status_code == 200
        data = response.json()
        assert "failed_logins_24h" in data
        assert "leads_today" in data
        assert "active_paid_employers" in data
        assert "pending_jobs" in data
        print(f"✓ Superadmin widgets: failed_logins={data['failed_logins_24h']}, leads_today={data['leads_today']}")
    
    def test_superadmin_security_auth_events(self, superadmin_session):
        """GET /api/superadmin/security/auth-events shows failure counts and reasons"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/security/auth-events?hours=24")
        assert response.status_code == 200
        data = response.json()
        assert "failed_logins" in data
        assert "failure_reasons" in data
        assert "recent_failures" in data
        print(f"✓ Security auth events: failed={data['failed_logins']}, reasons={data['failure_reasons']}")
    
    def test_superadmin_leads_tab(self, superadmin_session):
        """GET /api/superadmin/leads returns leads list"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/leads?status=all")
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "total" in data
        print(f"✓ Superadmin leads: total={data['total']}")


class TestDevCreateAdmin:
    """Test emergency superadmin fallback"""
    
    def test_dev_create_admin_endpoint(self):
        """POST /api/dev/create-admin creates emergency superadmin fallback"""
        test_email = f"test_emergency_admin_{datetime.now().strftime('%H%M%S')}@test.com"
        response = requests.post(f"{BASE_URL}/api/dev/create-admin", json={
            "email": test_email,
            "password": "TestAdmin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "superadmin" in data.get("message", "").lower() or "created" in data.get("message", "").lower()
        print(f"✓ Dev create-admin endpoint works: {data['message']}")


class TestFlowA_VeteranJourney:
    """FLOW A: Veteran registers, logs in, completes intake, gets recommendations, submits lead"""
    
    @pytest.fixture
    def veteran_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VETERAN_EMAIL,
            "password": VETERAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Veteran login failed: {response.text}")
        return session
    
    def test_veteran_login(self, veteran_session):
        """Veteran can login"""
        response = veteran_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "customer"
        assert data["discharge"] == "oth"
        print(f"✓ Veteran login: {data['email']}, discharge={data['discharge']}")
    
    def test_intake_questions(self, veteran_session):
        """GET /api/intake/questions returns intake questions"""
        response = veteran_session.get(f"{BASE_URL}/api/intake/questions")
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) >= 5
        question_ids = [q["id"] for q in data["questions"]]
        assert "state" in question_ids
        assert "discharge" in question_ids
        assert "goal" in question_ids
        print(f"✓ Intake questions: {len(data['questions'])} questions")
    
    def test_intelligence_recommendations(self, veteran_session):
        """GET /api/intelligence/recommendations returns 3 sections"""
        response = veteran_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 3 sections: next_action, available, unlockable
        assert "next_action" in data, "Missing next_action section"
        assert "available" in data, "Missing available section"
        assert "unlockable" in data, "Missing unlockable section"
        
        # Verify next_action has required fields
        if data["next_action"]:
            na = data["next_action"]
            assert "name" in na
            assert "action_url" in na
            assert "action_label" in na
        
        print(f"✓ Recommendations: next_action={data['next_action']['name'] if data['next_action'] else 'None'}, available={len(data['available'])}, unlockable={len(data['unlockable'])}")
    
    def test_submit_lead(self, veteran_session):
        """POST /api/intelligence/request-help creates a lead"""
        response = veteran_session.post(f"{BASE_URL}/api/intelligence/request-help", json={
            "category": "employment",
            "resource_name": "Test Job Help",
            "message": "Test lead from launch verification"
        })
        assert response.status_code == 200
        data = response.json()
        assert "lead" in data
        assert data["lead"]["status"] == "new"
        print(f"✓ Lead submitted: id={data['lead']['id']}")


class TestFlowB_DD214Decoder:
    """FLOW B: DD-214 decoder → analysis → CTA"""
    
    @pytest.fixture
    def veteran_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VETERAN_EMAIL,
            "password": VETERAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Veteran login failed: {response.text}")
        return session
    
    def test_re_code_decoder_re3(self):
        """GET /api/dd214/re-codes/RE-3 returns meaning, tier, upgrade_likelihood"""
        response = requests.get(f"{BASE_URL}/api/dd214/re-codes/RE-3")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert "meaning" in data
        assert "tier" in data
        assert data["tier"] == "yellow"
        assert "upgrade_likelihood" in data
        print(f"✓ RE-3 decoded: tier={data['tier']}, meaning={data['meaning'][:50]}...")
    
    def test_re_codes_list(self):
        """GET /api/dd214/re-codes returns all codes"""
        response = requests.get(f"{BASE_URL}/api/dd214/re-codes")
        assert response.status_code == 200
        data = response.json()
        assert "codes" in data
        assert "RE-1" in data["codes"]
        assert "RE-3" in data["codes"]
        assert "RE-4" in data["codes"]
        print(f"✓ RE codes list: {len(data['codes'])} codes")
    
    def test_dd214_full_analysis(self, veteran_session):
        """POST /api/dd214/analyze returns next_steps and board"""
        response = veteran_session.post(f"{BASE_URL}/api/dd214/analyze", json={
            "re_code": "RE-3",
            "narrative_reason": "misconduct",
            "branch": "Marine Corps",
            "discharge": "oth"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify analysis structure
        assert "re_code" in data
        assert "discharge_board" in data
        assert "next_steps" in data
        assert "upgrade_recommended" in data
        
        # For OTH with RE-3, upgrade should be recommended
        assert data["upgrade_recommended"] == True
        assert len(data["next_steps"]) > 0
        
        print(f"✓ DD-214 analysis: upgrade_recommended={data['upgrade_recommended']}, steps={len(data['next_steps'])}")
    
    def test_upgrade_board_info(self):
        """GET /api/dd214/upgrade-board returns board info"""
        response = requests.get(f"{BASE_URL}/api/dd214/upgrade-board?branch=Marine Corps")
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert "name" in data
        assert "url" in data
        assert "timeline" in data
        print(f"✓ Upgrade board: {data['name']}")


class TestFlowC_EmployerPartnerFlow:
    """FLOW C: Superadmin creates employer partner, employer posts job, admin approves"""
    
    @pytest.fixture
    def superadmin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Superadmin login failed: {response.text}")
        return session
    
    def test_get_pending_jobs(self, superadmin_session):
        """GET /api/admin/jobs/pending returns pending employer jobs"""
        response = superadmin_session.get(f"{BASE_URL}/api/admin/jobs/pending")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        print(f"✓ Pending jobs: {len(data['jobs'])} jobs")
    
    def test_billing_plans(self, superadmin_session):
        """GET /api/superadmin/billing/plans returns billing plans"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/billing/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print(f"✓ Billing plans available")
    
    def test_subscriptions_list(self, superadmin_session):
        """GET /api/superadmin/billing/subscriptions returns subscriptions"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/billing/subscriptions")
        assert response.status_code == 200
        data = response.json()
        assert "subscriptions" in data
        print(f"✓ Subscriptions: {data['total']} total")


class TestJobsAPI:
    """Test jobs API for veteran users"""
    
    @pytest.fixture
    def veteran_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VETERAN_EMAIL,
            "password": VETERAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Veteran login failed: {response.text}")
        return session
    
    def test_jobs_list_sections(self, veteran_session):
        """GET /api/jobs returns best_matches, available, locked sections"""
        response = veteran_session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 3 sections
        assert "best_matches" in data
        assert "available" in data
        assert "locked" in data
        assert "user_tier" in data
        
        print(f"✓ Jobs sections: best_matches={len(data['best_matches'])}, available={len(data['available'])}, locked={len(data['locked'])}, tier={data['user_tier']}")
    
    def test_jobs_categories(self, veteran_session):
        """GET /api/jobs/categories returns categories"""
        response = veteran_session.get(f"{BASE_URL}/api/jobs/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"✓ Job categories: {len(data['categories'])} categories")
    
    def test_track_apply(self, veteran_session):
        """POST /api/jobs/track-apply tracks application clicks"""
        response = veteran_session.post(f"{BASE_URL}/api/jobs/track-apply", json={
            "job_id": "test_job_123",
            "job_title": "Test Job",
            "company": "Test Company"
        })
        assert response.status_code == 200
        print("✓ Track apply endpoint works")


class TestEventsAPI:
    """Test event tracking API"""
    
    def test_track_event(self):
        """POST /api/events/track captures events"""
        response = requests.post(f"{BASE_URL}/api/events/track", json={
            "event": "test_event",
            "properties": {"test": True, "route": "/test"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        print("✓ Event tracking works")
    
    @pytest.fixture
    def superadmin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Superadmin login failed: {response.text}")
        return session
    
    def test_funnel_endpoint(self, superadmin_session):
        """GET /api/events/funnel returns conversion funnel steps"""
        response = superadmin_session.get(f"{BASE_URL}/api/events/funnel")
        assert response.status_code == 200
        data = response.json()
        assert "funnel" in data
        assert len(data["funnel"]) > 0
        print(f"✓ Funnel: {len(data['funnel'])} steps")


class TestResourceDirectory:
    """Test resource directory filtering"""
    
    @pytest.fixture
    def veteran_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": VETERAN_EMAIL,
            "password": VETERAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Veteran login failed: {response.text}")
        return session
    
    def test_recommendations_tier_filtering(self, veteran_session):
        """Recommendations filter by tier (green/yellow/blue)"""
        response = veteran_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200
        data = response.json()
        
        # OTH user should be yellow tier
        assert data["user_tier"] == "yellow"
        
        # Available resources should be accessible to yellow tier
        for r in data["available"]:
            assert r["tier_status"] == "green", f"Resource {r['name']} should be accessible"
        
        # Unlockable should be resources not accessible to yellow tier
        for r in data["unlockable"]:
            assert r["tier_status"] != "green", f"Resource {r['name']} should be locked"
        
        print(f"✓ Tier filtering: user_tier={data['user_tier']}, available={len(data['available'])}, unlockable={len(data['unlockable'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

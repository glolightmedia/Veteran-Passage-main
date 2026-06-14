"""
Sprint 3 Feature Tests - Veteran Passage
Tests for: Jobs, Mentorship, Chatbot, Pathways (frontend-only), Entrepreneur (frontend-only)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = "VetPass2026!"
PROVIDER_EMAIL = "provider@swords.org"
PROVIDER_PASSWORD = "ProvPass123"
CUSTOMER_EMAIL = "testvet@test.com"
CUSTOMER_PASSWORD = "TestPass123"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ API health check passed")


class TestJobsAPI:
    """Jobs Marketplace API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as customer for most tests
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        self.customer_token = response.cookies
        
        # Also get provider session
        self.provider_session = requests.Session()
        response = self.provider_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PROVIDER_EMAIL,
            "password": PROVIDER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Provider login failed")
    
    def test_list_jobs(self):
        """GET /api/jobs - List all jobs"""
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        assert isinstance(data["jobs"], list)
        print(f"✓ Listed {data['total']} jobs")
    
    def test_list_jobs_with_search(self):
        """GET /api/jobs?search=... - Search jobs"""
        response = self.session.get(f"{BASE_URL}/api/jobs?search=veteran")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        print(f"✓ Search returned {data['total']} jobs")
    
    def test_list_jobs_with_category_filter(self):
        """GET /api/jobs?category=... - Filter by category"""
        response = self.session.get(f"{BASE_URL}/api/jobs?category=Technology")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        # All returned jobs should be in Technology category
        for job in data["jobs"]:
            assert job.get("category") == "Technology"
        print(f"✓ Category filter returned {data['total']} Technology jobs")
    
    def test_list_jobs_second_chance_filter(self):
        """GET /api/jobs?second_chance=true - Filter second chance friendly"""
        response = self.session.get(f"{BASE_URL}/api/jobs?second_chance=true")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        # All returned jobs should be second chance friendly
        for job in data["jobs"]:
            assert job.get("second_chance_friendly") == True
        print(f"✓ Second chance filter returned {data['total']} jobs")
    
    def test_get_job_categories(self):
        """GET /api/jobs/categories - Get available categories"""
        response = self.session.get(f"{BASE_URL}/api/jobs/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        print(f"✓ Got {len(data['categories'])} job categories")
    
    def test_create_job_as_provider(self):
        """POST /api/jobs - Create job (provider only)"""
        job_data = {
            "title": "TEST_Veteran Software Engineer",
            "company": "TEST_VetTech Inc",
            "description": "Looking for veteran software engineers",
            "category": "Technology",
            "location": "Remote",
            "salary_range": "$80k-$120k",
            "second_chance_friendly": True,
            "veteran_preferred": True,
            "apply_url": "https://example.com/apply"
        }
        response = self.provider_session.post(f"{BASE_URL}/api/jobs", json=job_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == job_data["title"]
        assert data["company"] == job_data["company"]
        assert "id" in data
        self.created_job_id = data["id"]
        print(f"✓ Created job: {data['id']}")
        
        # Cleanup - delete the job
        delete_response = self.provider_session.delete(f"{BASE_URL}/api/jobs/{data['id']}")
        assert delete_response.status_code == 200
        print("✓ Cleaned up test job")
    
    def test_create_job_as_customer_fails(self):
        """POST /api/jobs - Customer cannot create jobs"""
        job_data = {
            "title": "TEST_Unauthorized Job",
            "company": "TEST_Company",
            "description": "This should fail",
            "category": "Technology"
        }
        response = self.session.post(f"{BASE_URL}/api/jobs", json=job_data)
        assert response.status_code == 403
        print("✓ Customer correctly denied job creation")
    
    def test_create_job_missing_fields(self):
        """POST /api/jobs - Missing required fields"""
        job_data = {
            "title": "TEST_Incomplete Job"
            # Missing company, description, category
        }
        response = self.provider_session.post(f"{BASE_URL}/api/jobs", json=job_data)
        assert response.status_code == 400
        print("✓ Missing fields correctly rejected")


class TestMentorshipAPI:
    """Mentorship API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as customer
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        
        # Also get admin session for mentor setup
        self.admin_session = requests.Session()
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
    
    def test_list_mentors_empty(self):
        """GET /api/mentorship/mentors - List mentors (may be empty initially)"""
        response = self.session.get(f"{BASE_URL}/api/mentorship/mentors")
        assert response.status_code == 200
        data = response.json()
        assert "mentors" in data
        assert "total" in data
        assert isinstance(data["mentors"], list)
        print(f"✓ Listed {data['total']} mentors")
    
    def test_update_mentor_profile_enable(self):
        """PUT /api/mentorship/profile - Enable mentor mode"""
        profile_data = {
            "is_mentor": True,
            "expertise": ["career transition", "technology"],
            "bio": "TEST_Veteran mentor helping others",
            "availability": "available"
        }
        response = self.admin_session.put(f"{BASE_URL}/api/mentorship/profile", json=profile_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Mentor profile updated"
        print("✓ Enabled mentor mode for admin")
        
        # Verify mentor appears in list
        list_response = self.session.get(f"{BASE_URL}/api/mentorship/mentors")
        assert list_response.status_code == 200
        mentors = list_response.json()["mentors"]
        admin_mentor = next((m for m in mentors if "TEST_Veteran mentor" in m.get("bio", "")), None)
        assert admin_mentor is not None
        self.mentor_id = admin_mentor["id"]
        print(f"✓ Verified mentor appears in directory: {self.mentor_id}")
    
    def test_get_my_requests(self):
        """GET /api/mentorship/requests - Get my requests"""
        response = self.session.get(f"{BASE_URL}/api/mentorship/requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
        print(f"✓ Got {len(data['requests'])} mentorship requests")
    
    def test_send_mentorship_request(self):
        """POST /api/mentorship/requests - Send request to mentor"""
        # First ensure admin is a mentor
        profile_data = {
            "is_mentor": True,
            "expertise": ["career transition"],
            "bio": "TEST_Mentor for testing",
            "availability": "available"
        }
        self.admin_session.put(f"{BASE_URL}/api/mentorship/profile", json=profile_data)
        
        # Get mentor ID
        list_response = self.session.get(f"{BASE_URL}/api/mentorship/mentors")
        mentors = list_response.json()["mentors"]
        if not mentors:
            pytest.skip("No mentors available")
        
        mentor_id = mentors[0]["id"]
        
        # Send request
        request_data = {
            "mentor_id": mentor_id,
            "message": "TEST_I would like to connect for career advice"
        }
        response = self.session.post(f"{BASE_URL}/api/mentorship/requests", json=request_data)
        
        # Could be 200 (success) or 400 (already pending)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["status"] == "pending"
            print(f"✓ Sent mentorship request: {data['id']}")
        else:
            print("✓ Request already pending (expected)")
    
    def test_send_request_to_self_fails(self):
        """POST /api/mentorship/requests - Cannot request yourself"""
        # Get current user ID
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        my_id = me_response.json()["id"]
        
        request_data = {
            "mentor_id": my_id,
            "message": "TEST_Self request"
        }
        response = self.session.post(f"{BASE_URL}/api/mentorship/requests", json=request_data)
        assert response.status_code == 400
        print("✓ Self-request correctly rejected")
    
    def test_filter_mentors_by_branch(self):
        """GET /api/mentorship/mentors?branch=... - Filter by branch"""
        response = self.session.get(f"{BASE_URL}/api/mentorship/mentors?branch=army")
        assert response.status_code == 200
        data = response.json()
        assert "mentors" in data
        print(f"✓ Branch filter returned {data['total']} mentors")


class TestChatbotAPI:
    """AI Chatbot API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
    
    def test_create_chat_session(self):
        """POST /api/chat/sessions - Create new chat session"""
        response = self.session.post(f"{BASE_URL}/api/chat/sessions", json={})
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert len(data["session_id"]) > 0
        self.session_id = data["session_id"]
        print(f"✓ Created chat session: {data['session_id'][:8]}...")
    
    def test_list_chat_sessions(self):
        """GET /api/chat/sessions - List user's sessions"""
        response = self.session.get(f"{BASE_URL}/api/chat/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        print(f"✓ Listed {len(data['sessions'])} chat sessions")
    
    def test_send_message_and_get_response(self):
        """POST /api/chat/sessions/{id}/message - Send message and get AI response"""
        # Create session first
        create_response = self.session.post(f"{BASE_URL}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]
        
        # Send message
        message_data = {"message": "What benefits am I eligible for?"}
        response = self.session.post(
            f"{BASE_URL}/api/chat/sessions/{session_id}/message",
            json=message_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        assert data["session_id"] == session_id
        print(f"✓ Got AI response: {data['response'][:100]}...")
    
    def test_get_session_history(self):
        """GET /api/chat/sessions/{id} - Get session with messages"""
        # Create session and send message
        create_response = self.session.post(f"{BASE_URL}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]
        
        self.session.post(
            f"{BASE_URL}/api/chat/sessions/{session_id}/message",
            json={"message": "TEST_Hello"}
        )
        
        # Get session
        response = self.session.get(f"{BASE_URL}/api/chat/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) >= 2  # User message + AI response
        print(f"✓ Got session with {len(data['messages'])} messages")
    
    def test_send_empty_message_fails(self):
        """POST /api/chat/sessions/{id}/message - Empty message rejected"""
        create_response = self.session.post(f"{BASE_URL}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/chat/sessions/{session_id}/message",
            json={"message": ""}
        )
        assert response.status_code == 400
        print("✓ Empty message correctly rejected")
    
    def test_invalid_session_fails(self):
        """GET /api/chat/sessions/{id} - Invalid session returns 404"""
        response = self.session.get(f"{BASE_URL}/api/chat/sessions/invalid-session-id")
        assert response.status_code == 404
        print("✓ Invalid session correctly returns 404")


class TestAuthProtection:
    """Verify all new endpoints require authentication"""
    
    def test_jobs_requires_auth(self):
        """Jobs endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 401
        print("✓ Jobs endpoint requires auth")
    
    def test_mentorship_requires_auth(self):
        """Mentorship endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/mentorship/mentors")
        assert response.status_code == 401
        print("✓ Mentorship endpoint requires auth")
    
    def test_chat_requires_auth(self):
        """Chat endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/sessions")
        assert response.status_code == 401
        print("✓ Chat endpoint requires auth")


class TestSeededJobs:
    """Verify seeded jobs exist"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
    
    def test_seeded_jobs_exist(self):
        """Verify 5 seeded jobs exist"""
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        # Should have at least 5 seeded jobs
        assert data["total"] >= 5, f"Expected at least 5 jobs, got {data['total']}"
        print(f"✓ Found {data['total']} jobs (expected >= 5)")
    
    def test_seeded_jobs_have_badges(self):
        """Verify seeded jobs have Second Chance and Vet Preferred badges"""
        response = self.session.get(f"{BASE_URL}/api/jobs")
        data = response.json()
        
        second_chance_count = sum(1 for j in data["jobs"] if j.get("second_chance_friendly"))
        vet_preferred_count = sum(1 for j in data["jobs"] if j.get("veteran_preferred"))
        
        assert second_chance_count > 0, "No second chance friendly jobs found"
        assert vet_preferred_count > 0, "No veteran preferred jobs found"
        print(f"✓ Found {second_chance_count} second chance, {vet_preferred_count} vet preferred jobs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

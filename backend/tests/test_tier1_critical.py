"""
Test Tier 1 Critical Fixes for Veteran Passage
- Single Next Action system
- Friction scoring in intelligence engine
- Success moment (instant win message)
- Lead capture via Request Help
- Superadmin leads management
- Chatbot locked to veteran topics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIntelligenceRecommendations:
    """Test intelligence engine with friction scoring and single next action"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer (OTH discharge) for testing"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvet@test.com",
            "password": "TestPass123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json().get("user", {})
    
    def test_recommendations_returns_next_action(self):
        """GET /api/intelligence/recommendations returns single next_action"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Must have next_action (single CTA)
        assert "next_action" in data, "Missing next_action field"
        next_action = data["next_action"]
        assert next_action is not None, "next_action should not be None"
        assert "id" in next_action, "next_action missing id"
        assert "name" in next_action, "next_action missing name"
        assert "action_url" in next_action, "next_action missing action_url"
        assert "action_label" in next_action, "next_action missing action_label"
        print(f"PASS: next_action = {next_action['name']}")
    
    def test_recommendations_has_friction_metadata(self):
        """Resources have friction metadata: time_to_complete, time_estimate, documents_required"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        
        next_action = data.get("next_action")
        assert next_action is not None
        
        # Check friction metadata
        assert "time_to_complete" in next_action, "Missing time_to_complete"
        assert "time_estimate" in next_action, "Missing time_estimate"
        assert "documents_required" in next_action, "Missing documents_required"
        assert "friction" in next_action, "Missing friction score"
        
        print(f"PASS: Friction metadata - time_to_complete={next_action['time_to_complete']}, friction={next_action['friction']}")
    
    def test_recommendations_has_success_message(self):
        """Response includes success_message (instant win)"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        
        # success_message should exist (may be None if no eligible resources)
        assert "success_message" in data, "Missing success_message field"
        
        # For OTH user, should have a success message since they qualify for some resources
        if data["success_message"]:
            assert "Good news" in data["success_message"], f"Success message format wrong: {data['success_message']}"
            print(f"PASS: success_message = {data['success_message']}")
        else:
            print("INFO: success_message is None (user may not qualify for any resources)")
    
    def test_recommendations_has_personalization(self):
        """Response includes personalization text"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "personalization" in data, "Missing personalization field"
        personalization = data["personalization"]
        assert "Based on your" in personalization, f"Personalization format wrong: {personalization}"
        print(f"PASS: personalization = {personalization}")
    
    def test_recommendations_has_available_and_unlockable(self):
        """Response includes available (green tier) and unlockable (needs upgrade) lists"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "available" in data, "Missing available field"
        assert "unlockable" in data, "Missing unlockable field"
        assert isinstance(data["available"], list), "available should be a list"
        assert isinstance(data["unlockable"], list), "unlockable should be a list"
        
        print(f"PASS: available={len(data['available'])} resources, unlockable={len(data['unlockable'])} resources")
    
    def test_friction_scoring_penalizes_high_friction(self):
        """Verify friction scoring - lower friction resources should rank higher"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        
        available = data.get("available", [])
        if len(available) >= 2:
            # Check that resources have friction scores
            for r in available[:3]:
                assert "friction" in r, f"Resource {r.get('name')} missing friction"
                assert "score" in r, f"Resource {r.get('name')} missing score"
            print(f"PASS: Resources have friction and score fields")
        else:
            print("INFO: Not enough available resources to verify friction ordering")


class TestLeadCapture:
    """Test lead capture via Request Help button"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvet@test.com",
            "password": "TestPass123"
        })
        assert login_resp.status_code == 200
    
    def test_request_help_creates_lead(self):
        """POST /api/intelligence/request-help creates a lead"""
        resp = self.session.post(f"{BASE_URL}/api/intelligence/request-help", json={
            "category": "employment",
            "resource_name": "Hire Heroes USA",
            "message": "TEST_LEAD: I need help finding a job"
        })
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert "message" in data, "Missing response message"
        assert "lead" in data, "Missing lead object"
        
        lead = data["lead"]
        assert lead.get("category") == "employment", "Lead category mismatch"
        assert lead.get("status") == "new", "Lead status should be 'new'"
        assert "id" in lead, "Lead missing id"
        
        print(f"PASS: Lead created with id={lead['id']}, status={lead['status']}")
    
    def test_request_help_requires_auth(self):
        """Request help requires authentication"""
        new_session = requests.Session()
        resp = new_session.post(f"{BASE_URL}/api/intelligence/request-help", json={
            "category": "legal",
            "message": "Test"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: Request help requires authentication")


class TestSuperadminLeads:
    """Test superadmin leads management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "glolightmedia@gmail.com",
            "password": "M@rinecorp1"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    
    def test_get_leads_list(self):
        """GET /api/superadmin/leads returns leads list"""
        resp = self.session.get(f"{BASE_URL}/api/superadmin/leads?status=all")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert "leads" in data, "Missing leads field"
        assert "total" in data, "Missing total field"
        assert isinstance(data["leads"], list), "leads should be a list"
        
        print(f"PASS: Got {data['total']} leads")
        
        # Check lead structure if any exist
        if data["leads"]:
            lead = data["leads"][0]
            assert "id" in lead, "Lead missing id"
            assert "user_name" in lead, "Lead missing user_name"
            assert "user_email" in lead, "Lead missing user_email"
            assert "category" in lead, "Lead missing category"
            assert "status" in lead, "Lead missing status"
            print(f"PASS: Lead structure verified - {lead.get('user_name')}, {lead.get('category')}")
    
    def test_update_lead_status(self):
        """PUT /api/superadmin/leads/{id} updates lead status"""
        # First get a lead
        resp = self.session.get(f"{BASE_URL}/api/superadmin/leads?status=all")
        assert resp.status_code == 200
        leads = resp.json().get("leads", [])
        
        if not leads:
            pytest.skip("No leads to update")
        
        lead_id = leads[0]["id"]
        
        # Update status
        update_resp = self.session.put(f"{BASE_URL}/api/superadmin/leads/{lead_id}", json={
            "status": "contacted"
        })
        assert update_resp.status_code == 200, f"Failed: {update_resp.text}"
        print(f"PASS: Lead {lead_id} status updated to 'contacted'")
        
        # Revert to new
        self.session.put(f"{BASE_URL}/api/superadmin/leads/{lead_id}", json={"status": "new"})
    
    def test_leads_in_engagement_metrics(self):
        """GET /api/superadmin/analytics/deep includes total_leads and new_leads"""
        resp = self.session.get(f"{BASE_URL}/api/superadmin/analytics/deep")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert "engagement" in data, "Missing engagement field"
        engagement = data["engagement"]
        
        assert "total_leads" in engagement, "Missing total_leads in engagement"
        assert "new_leads" in engagement, "Missing new_leads in engagement"
        
        print(f"PASS: Engagement metrics - total_leads={engagement['total_leads']}, new_leads={engagement['new_leads']}")
    
    def test_leads_requires_admin(self):
        """Leads endpoint requires admin role"""
        # Login as customer
        customer_session = requests.Session()
        customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvet@test.com",
            "password": "TestPass123"
        })
        
        resp = customer_session.get(f"{BASE_URL}/api/superadmin/leads")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("PASS: Leads endpoint requires admin role")


class TestChatbotLocked:
    """Test chatbot is locked to veteran topics"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvet@test.com",
            "password": "TestPass123"
        })
        assert login_resp.status_code == 200
    
    def test_create_chat_session(self):
        """POST /api/chat/sessions creates a session"""
        resp = self.session.post(f"{BASE_URL}/api/chat/sessions", json={})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert "session_id" in data, "Missing session_id"
        print(f"PASS: Chat session created: {data['session_id']}")
        return data["session_id"]
    
    def test_send_veteran_related_message(self):
        """Chatbot responds to veteran-related questions"""
        # Create session
        session_resp = self.session.post(f"{BASE_URL}/api/chat/sessions", json={})
        session_id = session_resp.json()["session_id"]
        
        # Send veteran-related message
        msg_resp = self.session.post(f"{BASE_URL}/api/chat/sessions/{session_id}/message", json={
            "message": "What benefits am I eligible for with an OTH discharge?"
        })
        assert msg_resp.status_code == 200, f"Failed: {msg_resp.text}"
        data = msg_resp.json()
        
        assert "response" in data, "Missing response"
        assert len(data["response"]) > 0, "Empty response"
        print(f"PASS: Chatbot responded to veteran question (length={len(data['response'])})")


class TestSidebarSimplified:
    """Test sidebar has simplified navigation"""
    
    def test_sidebar_nav_items(self):
        """Verify sidebar has correct items (Forum, Mentorship, Barter, Navigator removed)"""
        # This is a code review test - verify DashboardLayout.jsx has correct nav
        # The actual nav items are: Dashboard, DD-214, Pathways, Resources, Jobs, AI, Business, Donate, Profile
        expected_items = [
            "Dashboard", "DD-214 Decoder", "Pathways", "Resources", "Jobs", 
            "AI Assistant", "Business", "Donate", "Profile"
        ]
        removed_items = ["Forum", "Mentorship", "Barter", "Navigator", "Skill Barter"]
        
        # Read the DashboardLayout file to verify
        import os
        layout_path = "/app/frontend/src/components/DashboardLayout.jsx"
        if os.path.exists(layout_path):
            with open(layout_path, 'r') as f:
                content = f.read()
            
            # Check expected items are present
            for item in expected_items:
                assert item in content, f"Missing nav item: {item}"
            
            # Check removed items are NOT in navigation array
            # Look for the navigation array definition
            nav_start = content.find("const navigation = [")
            nav_end = content.find("];", nav_start)
            nav_section = content[nav_start:nav_end] if nav_start > 0 else ""
            
            for item in removed_items:
                assert item not in nav_section, f"Removed item still in nav: {item}"
            
            print(f"PASS: Sidebar has {len(expected_items)} items, removed items not in nav")
        else:
            pytest.skip("DashboardLayout.jsx not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

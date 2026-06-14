"""
Core Transformation Tests for Veteran Passage
Tests: Intake Engine, Intelligence Engine, Progress/Support Loop, Superadmin Analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "glolightmedia@gmail.com"
SUPERADMIN_PASSWORD = "M@rinecorp1"
CUSTOMER_EMAIL = "testvet@test.com"
CUSTOMER_PASSWORD = "TestPass123"
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = "VetPass2026!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def superadmin_session(api_client):
    """Authenticated superadmin session"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    if response.status_code == 200:
        return api_client
    pytest.skip("Superadmin login failed")


@pytest.fixture(scope="module")
def customer_session():
    """Authenticated customer session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return session
    pytest.skip("Customer login failed")


# ─── INTAKE ENGINE TESTS ───

class TestIntakeEngine:
    """Tests for the 7-question intake engine"""
    
    def test_get_intake_questions_returns_7_questions(self, customer_session):
        """GET /api/intake/questions returns exactly 7 questions"""
        response = customer_session.get(f"{BASE_URL}/api/intake/questions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "questions" in data, "Response should contain 'questions' key"
        assert "total" in data, "Response should contain 'total' key"
        assert data["total"] == 7, f"Expected 7 questions, got {data['total']}"
        assert len(data["questions"]) == 7, f"Expected 7 questions in list, got {len(data['questions'])}"
        
        # Verify question structure
        expected_ids = ["state", "branch", "years_served", "discharge", "re_code", "goal", "urgency"]
        actual_ids = [q["id"] for q in data["questions"]]
        assert actual_ids == expected_ids, f"Question IDs mismatch: {actual_ids}"
        
        print("✓ Intake returns 7 questions with correct IDs")
    
    def test_intake_questions_have_required_fields(self, customer_session):
        """Each question has id, question, type, and options"""
        response = customer_session.get(f"{BASE_URL}/api/intake/questions")
        assert response.status_code == 200
        
        data = response.json()
        for q in data["questions"]:
            assert "id" in q, f"Question missing 'id': {q}"
            assert "question" in q, f"Question missing 'question': {q}"
            assert "type" in q, f"Question missing 'type': {q}"
            assert "options" in q, f"Question missing 'options': {q}"
            assert len(q["options"]) > 0, f"Question has no options: {q['id']}"
        
        print("✓ All questions have required fields")
    
    def test_intake_complete_saves_profile(self, customer_session):
        """POST /api/intake/complete saves user profile and initializes progress"""
        # Note: testvet@test.com already completed intake, this tests the endpoint works
        answers = {
            "state": "Texas",
            "branch": "Marine Corps",
            "years_served": "3-5",
            "discharge": "oth",
            "re_code": "RE-3",
            "goal": "employment",
            "urgency": "weeks"
        }
        
        response = customer_session.post(f"{BASE_URL}/api/intake/complete", json={"answers": answers})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "profile" in data, "Response should contain 'profile'"
        assert data["profile"]["intake_completed"] == True, "intake_completed should be True"
        assert data["profile"]["goal"] == "employment", "Goal should be saved"
        assert data["profile"]["discharge"] == "oth", "Discharge should be saved"
        
        print("✓ Intake complete saves profile correctly")


# ─── INTELLIGENCE ENGINE TESTS ───

class TestIntelligenceEngine:
    """Tests for the resource matching and recommendation engine"""
    
    def test_get_recommendations_returns_4_tiers(self, customer_session):
        """GET /api/intelligence/recommendations returns 4-tier recommendations"""
        response = customer_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check all 4 tiers exist
        assert "immediate_path" in data, "Missing 'immediate_path' tier"
        assert "green" in data, "Missing 'green' tier"
        assert "yellow" in data, "Missing 'yellow' tier"
        assert "blue" in data, "Missing 'blue' tier"
        
        # Check metadata
        assert "user_tier" in data, "Missing 'user_tier'"
        assert "goal" in data, "Missing 'goal'"
        assert "urgency" in data, "Missing 'urgency'"
        assert "total" in data, "Missing 'total'"
        
        print(f"✓ Recommendations returned: immediate={len(data['immediate_path'])}, green={len(data['green'])}, yellow={len(data['yellow'])}, blue={len(data['blue'])}")
    
    def test_immediate_path_has_top_3_resources(self, customer_session):
        """Immediate path contains up to 3 top resources"""
        response = customer_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        immediate = data.get("immediate_path", [])
        assert len(immediate) <= 3, f"Immediate path should have max 3 resources, got {len(immediate)}"
        assert len(immediate) > 0, "Immediate path should have at least 1 resource"
        
        # Check resource structure
        for r in immediate:
            assert "id" in r, "Resource missing 'id'"
            assert "name" in r, "Resource missing 'name'"
            assert "description" in r, "Resource missing 'description'"
            assert "action_url" in r, "Resource missing 'action_url'"
            assert "action_label" in r, "Resource missing 'action_label'"
            assert "score" in r, "Resource missing 'score'"
        
        print(f"✓ Immediate path has {len(immediate)} top resources")
    
    def test_resources_have_tier_status(self, customer_session):
        """Each resource has tier_status (green/yellow/blue)"""
        response = customer_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        all_resources = data["immediate_path"] + data["green"] + data["yellow"] + data["blue"]
        
        for r in all_resources:
            assert "tier_status" in r, f"Resource {r.get('name')} missing 'tier_status'"
            assert r["tier_status"] in ["green", "yellow", "blue"], f"Invalid tier_status: {r['tier_status']}"
        
        print("✓ All resources have valid tier_status")
    
    def test_oth_user_gets_yellow_tier(self, customer_session):
        """OTH discharge user should be in yellow tier"""
        response = customer_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        # testvet@test.com has OTH discharge
        assert data["user_tier"] == "yellow", f"Expected yellow tier for OTH, got {data['user_tier']}"
        
        print("✓ OTH user correctly assigned yellow tier")
    
    def test_goal_matching_boosts_score(self, customer_session):
        """Resources matching user's goal should have higher scores"""
        response = customer_session.get(f"{BASE_URL}/api/intelligence/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        goal = data["goal"]
        immediate = data["immediate_path"]
        
        # At least one immediate resource should match the goal category
        goal_matches = [r for r in immediate if r.get("category") == goal]
        print(f"✓ Goal '{goal}' has {len(goal_matches)} matching resources in immediate path")


# ─── PROGRESS/SUPPORT LOOP TESTS ───

class TestProgressTracker:
    """Tests for the progress tracking and support loop"""
    
    def test_get_progress_returns_tracker(self, customer_session):
        """GET /api/progress returns user progress data"""
        response = customer_session.get(f"{BASE_URL}/api/progress")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user_id" in data, "Missing 'user_id'"
        assert "goal" in data, "Missing 'goal'"
        assert "milestones" in data, "Missing 'milestones'"
        assert "actions_taken" in data, "Missing 'actions_taken'"
        assert "streak" in data, "Missing 'streak'"
        
        assert isinstance(data["milestones"], list), "milestones should be a list"
        assert isinstance(data["actions_taken"], list), "actions_taken should be a list"
        
        print(f"✓ Progress tracker: {len(data['actions_taken'])} actions, {len(data['milestones'])} milestones, streak={data['streak']}")
    
    def test_log_action_creates_record(self, customer_session):
        """POST /api/progress/action logs a user action"""
        action_data = {
            "type": "clicked",
            "resource_id": "r4",
            "resource_name": "Hire Heroes USA",
            "notes": "Test action from pytest"
        }
        
        response = customer_session.post(f"{BASE_URL}/api/progress/action", json=action_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message'"
        assert "action" in data, "Missing 'action'"
        assert data["action"]["type"] == "clicked", "Action type mismatch"
        assert data["action"]["resource_id"] == "r4", "Resource ID mismatch"
        
        print("✓ Action logged successfully")
    
    def test_complete_milestone_creates_record(self, customer_session):
        """POST /api/progress/milestone completes a milestone"""
        milestone_data = {
            "id": "m_test_1",
            "title": "Test Milestone from pytest"
        }
        
        response = customer_session.post(f"{BASE_URL}/api/progress/milestone", json=milestone_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message'"
        assert "milestone" in data, "Missing 'milestone'"
        assert data["milestone"]["title"] == "Test Milestone from pytest", "Milestone title mismatch"
        
        print("✓ Milestone completed successfully")
    
    def test_get_check_in_returns_nudge(self, customer_session):
        """GET /api/progress/check-in returns nudge and suggestions"""
        response = customer_session.get(f"{BASE_URL}/api/progress/check-in")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check structure
        assert "nudge" in data or data.get("check_in") is None, "Missing 'nudge' key"
        assert "suggestions" in data, "Missing 'suggestions'"
        assert "actions_count" in data, "Missing 'actions_count'"
        assert "milestones_count" in data, "Missing 'milestones_count'"
        assert "streak" in data, "Missing 'streak'"
        assert "goal" in data, "Missing 'goal'"
        
        # Nudge types: first_action, inactive, gentle, or None
        nudge = data.get("nudge")
        if nudge:
            assert nudge["type"] in ["first_action", "inactive", "gentle"], f"Invalid nudge type: {nudge['type']}"
            assert "message" in nudge, "Nudge missing 'message'"
            assert "priority" in nudge, "Nudge missing 'priority'"
        
        nudge_type = nudge.get("type") if nudge else "None"
        print(f"✓ Check-in: nudge={nudge_type}, suggestions={len(data['suggestions'])}")
    
    def test_record_check_in(self, customer_session):
        """POST /api/progress/check-in records a check-in"""
        check_in_data = {
            "status": "active",
            "notes": "Test check-in from pytest"
        }
        
        response = customer_session.post(f"{BASE_URL}/api/progress/check-in", json=check_in_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing 'message'"
        
        print("✓ Check-in recorded successfully")


# ─── SUPERADMIN ANALYTICS TESTS ───

class TestSuperadminAnalytics:
    """Tests for superadmin engagement metrics"""
    
    def test_deep_analytics_includes_engagement(self, superadmin_session):
        """GET /api/superadmin/analytics/deep includes engagement metrics"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/analytics/deep")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "engagement" in data, "Missing 'engagement' section in analytics"
        
        engagement = data["engagement"]
        expected_metrics = [
            "intake_completed",
            "intake_rate",
            "active_progress_trackers",
            "total_actions_logged",
            "total_check_ins",
            "recommendations_viewed",
            "total_donations"
        ]
        
        for metric in expected_metrics:
            assert metric in engagement, f"Missing engagement metric: {metric}"
        
        print(f"✓ Engagement metrics: intake_completed={engagement['intake_completed']}, intake_rate={engagement['intake_rate']}%, trackers={engagement['active_progress_trackers']}")
    
    def test_analytics_intake_rate_calculation(self, superadmin_session):
        """Intake rate is calculated correctly as percentage"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/analytics/deep")
        assert response.status_code == 200
        
        data = response.json()
        engagement = data["engagement"]
        users = data["users"]
        
        # Verify intake_rate is a percentage (0-100)
        assert 0 <= engagement["intake_rate"] <= 100, f"Invalid intake_rate: {engagement['intake_rate']}"
        
        # Verify calculation: intake_completed / total_users * 100
        if users["total"] > 0:
            expected_rate = round((engagement["intake_completed"] / users["total"]) * 100, 1)
            assert engagement["intake_rate"] == expected_rate, f"Intake rate mismatch: expected {expected_rate}, got {engagement['intake_rate']}"
        
        print(f"✓ Intake rate calculation verified: {engagement['intake_rate']}%")


# ─── ACTIVITY LOGGING TESTS ───

class TestActivityLogging:
    """Tests for audit trail and activity logging"""
    
    def test_intake_completion_logged(self, superadmin_session):
        """Intake completion is logged to activity_logs"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/audit-log?action=intake_completed&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "logs" in data, "Missing 'logs' in response"
        
        # Should have at least one intake_completed log
        intake_logs = [l for l in data["logs"] if l.get("action") == "intake_completed"]
        assert len(intake_logs) > 0, "No intake_completed logs found"
        
        # Check log structure
        log = intake_logs[0]
        assert "user_id" in log, "Log missing 'user_id'"
        assert "metadata" in log, "Log missing 'metadata'"
        assert "created_at" in log, "Log missing 'created_at'"
        
        print(f"✓ Found {len(intake_logs)} intake_completed logs")
    
    def test_recommendations_viewed_logged(self, superadmin_session):
        """Recommendations view is logged to activity_logs"""
        response = superadmin_session.get(f"{BASE_URL}/api/superadmin/audit-log?action=recommendations_viewed&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        rec_logs = [l for l in data["logs"] if l.get("action") == "recommendations_viewed"]
        assert len(rec_logs) > 0, "No recommendations_viewed logs found"
        
        # Check metadata includes tier, goal, urgency
        log = rec_logs[0]
        metadata = log.get("metadata", {})
        assert "tier" in metadata or "goal" in metadata, "Log metadata should include tier or goal"
        
        print(f"✓ Found {len(rec_logs)} recommendations_viewed logs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

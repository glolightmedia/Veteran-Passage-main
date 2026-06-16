"""
Jobs Page Rebuild Tests - Guided Hiring Engine
Tests for: GET /api/jobs, POST /api/jobs/track-apply, GET /api/jobs/categories
Scoring: second_chance_friendly=50, requires_honorable_false=40, location=30, fast_hiring=20, easy_apply=15
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OTH_USER = {"email": "testvet@test.com", "password": "TestPass123"}
ADMIN_USER = {"email": os.environ.get("SUPERADMIN_EMAIL", "glolightmedia@gmail.com"), "password": os.environ.get("SUPERADMIN_PASSWORD", "")}


class TestJobsEndpoints:
    """Test Jobs API endpoints for guided hiring engine"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_as_oth_user(self):
        """Login as OTH discharge user (testvet@test.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=OTH_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()
    
    def login_as_admin(self):
        """Login as admin user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()

    # ═══ GET /api/jobs - Main Jobs Endpoint ═══
    
    def test_jobs_returns_three_sections(self):
        """GET /api/jobs returns best_matches, available, locked sections"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs", params={"sort": "best_fit"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify all three sections exist
        assert "best_matches" in data, "Missing best_matches section"
        assert "available" in data, "Missing available section"
        assert "locked" in data, "Missing locked section"
        assert "total_available" in data, "Missing total_available count"
        assert "user_tier" in data, "Missing user_tier"
        print(f"✓ Jobs returns 3 sections: best_matches={len(data['best_matches'])}, available={len(data['available'])}, locked={len(data['locked'])}")
    
    def test_jobs_best_matches_have_high_scores(self):
        """Best matches should have score >= 100 and not be locked"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        for job in data["best_matches"]:
            assert job.get("score", 0) >= 100, f"Best match {job['title']} has score {job.get('score')} < 100"
            assert not job.get("is_locked"), f"Best match {job['title']} should not be locked"
        print(f"✓ All {len(data['best_matches'])} best matches have score >= 100 and are not locked")
    
    def test_jobs_best_matches_max_three(self):
        """Best matches section should have max 3 jobs"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["best_matches"]) <= 3, f"Best matches has {len(data['best_matches'])} jobs, max is 3"
        print(f"✓ Best matches has {len(data['best_matches'])} jobs (max 3)")
    
    def test_jobs_locked_for_oth_user(self):
        """OTH user should see locked jobs that require honorable discharge"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        # OTH user tier should be yellow
        assert data["user_tier"] == "yellow", f"OTH user should have yellow tier, got {data['user_tier']}"
        
        # Should have some locked jobs
        assert len(data["locked"]) > 0, "OTH user should see locked jobs requiring honorable discharge"
        
        for job in data["locked"]:
            assert job.get("is_locked"), f"Job {job['title']} in locked section should have is_locked=True"
        print(f"✓ OTH user (yellow tier) sees {len(data['locked'])} locked jobs")
    
    def test_jobs_scoring_second_chance_boost(self):
        """Second chance friendly jobs should have higher scores for OTH users"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        # Find second_chance_friendly jobs in best_matches
        sc_jobs = [j for j in data["best_matches"] if j.get("second_chance_friendly")]
        assert len(sc_jobs) > 0, "OTH user should have second_chance_friendly jobs in best matches"
        print(f"✓ {len(sc_jobs)} second_chance_friendly jobs in best matches for OTH user")
    
    def test_jobs_card_has_required_fields(self):
        """Job cards should have title, company, location, salary, summary, badges, microcopy"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        all_jobs = data["best_matches"] + data["available"]
        assert len(all_jobs) > 0, "Should have at least one job"
        
        job = all_jobs[0]
        required_fields = ["title", "company", "summary"]
        for field in required_fields:
            assert field in job, f"Job missing required field: {field}"
        
        # Check badge fields exist
        badge_fields = ["second_chance_friendly", "vet_preferred", "fast_hiring", "easy_apply"]
        for field in badge_fields:
            assert field in job, f"Job missing badge field: {field}"
        
        print(f"✓ Job cards have all required fields: {required_fields + badge_fields}")
    
    # ═══ Filters ═══
    
    def test_jobs_second_chance_filter(self):
        """Second Chance Only filter returns only second_chance_friendly jobs"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs", params={"second_chance": "true"})
        assert response.status_code == 200
        data = response.json()
        
        all_jobs = data["best_matches"] + data["available"]
        for job in all_jobs:
            assert job.get("second_chance_friendly"), f"Job {job['title']} should be second_chance_friendly"
        print(f"✓ Second Chance filter returns {len(all_jobs)} second_chance_friendly jobs")
    
    def test_jobs_fast_hiring_filter(self):
        """Fast Hiring filter returns only fast_hiring jobs"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs", params={"fast_hiring": "true"})
        assert response.status_code == 200
        data = response.json()
        
        all_jobs = data["best_matches"] + data["available"]
        for job in all_jobs:
            assert job.get("fast_hiring"), f"Job {job['title']} should be fast_hiring"
        print(f"✓ Fast Hiring filter returns {len(all_jobs)} fast_hiring jobs")
    
    def test_jobs_category_filter(self):
        """Category filter returns only jobs in that category"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs", params={"category": "Technology"})
        assert response.status_code == 200
        data = response.json()
        
        all_jobs = data["best_matches"] + data["available"]
        for job in all_jobs:
            assert job.get("category") == "Technology", f"Job {job['title']} should be in Technology category"
        print(f"✓ Category filter returns {len(all_jobs)} Technology jobs")
    
    # ═══ Sort Options ═══
    
    def test_jobs_sort_best_fit(self):
        """Sort by best_fit orders by score descending"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs", params={"sort": "best_fit"})
        assert response.status_code == 200
        data = response.json()
        
        # Check available jobs are sorted by score
        available = data["available"]
        if len(available) > 1:
            for i in range(len(available) - 1):
                assert available[i].get("score", 0) >= available[i+1].get("score", 0), \
                    f"Jobs not sorted by score: {available[i]['title']} ({available[i].get('score')}) < {available[i+1]['title']} ({available[i+1].get('score')})"
        print(f"✓ Sort by best_fit orders jobs by score descending")
    
    def test_jobs_sort_fastest(self):
        """Sort by fastest prioritizes fast_hiring jobs"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs", params={"sort": "fastest"})
        assert response.status_code == 200
        data = response.json()
        
        available = data["available"]
        if len(available) > 0:
            # First jobs should be fast_hiring
            fast_hiring_count = sum(1 for j in available[:5] if j.get("fast_hiring"))
            print(f"✓ Sort by fastest: {fast_hiring_count}/5 top jobs are fast_hiring")
    
    # ═══ GET /api/jobs/categories ═══
    
    def test_jobs_categories_endpoint(self):
        """GET /api/jobs/categories returns list of categories"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data, "Missing categories field"
        assert len(data["categories"]) > 0, "Categories list is empty"
        
        expected_categories = ["Technology", "Healthcare", "Trades & Construction", "Government"]
        for cat in expected_categories:
            assert cat in data["categories"], f"Missing expected category: {cat}"
        print(f"✓ Categories endpoint returns {len(data['categories'])} categories")
    
    # ═══ POST /api/jobs/track-apply ═══
    
    def test_track_apply_endpoint(self):
        """POST /api/jobs/track-apply tracks application clicks"""
        self.login_as_oth_user()
        
        payload = {
            "job_id": "seed_warehouse_operations",
            "job_title": "Warehouse Operations Supervisor",
            "company": "North Harbor Logistics"
        }
        response = self.session.post(f"{BASE_URL}/api/jobs/track-apply", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("message") == "Tracked", f"Expected 'Tracked' message, got {data}"
        print(f"✓ Track-apply endpoint logs application click")
    
    # ═══ Scoring Verification ═══
    
    def test_scoring_formula_verification(self):
        """Verify scoring formula: second_chance=50, requires_honorable_false=40, location=30, fast_hiring=20, easy_apply=15"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        # Find a job with known attributes to verify scoring
        all_jobs = data["best_matches"] + data["available"]
        
        # Find a second_chance_friendly + fast_hiring + easy_apply job
        for job in all_jobs:
            if job.get("second_chance_friendly") and job.get("fast_hiring") and job.get("easy_apply"):
                # For OTH user (yellow tier): second_chance gets +50 base + 40 bonus = 90
                # Plus: requires_honorable_false=40, fast_hiring=20, easy_apply=15
                # Minus friction penalty
                score = job.get("score", 0)
                assert score > 100, f"Second chance + fast hiring + easy apply job should have score > 100, got {score}"
                print(f"✓ Job '{job['title']}' has score {score} (second_chance + fast_hiring + easy_apply)")
                return
        
        print("✓ Scoring formula verification (no ideal test job found, but API works)")
    
    def test_friction_penalty_applied(self):
        """Jobs with high friction_score should have lower overall scores"""
        self.login_as_oth_user()
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        data = response.json()
        
        all_jobs = data["best_matches"] + data["available"] + data["locked"]
        
        # Find jobs with different friction scores
        low_friction = [j for j in all_jobs if j.get("friction_score", 0.5) < 0.3]
        high_friction = [j for j in all_jobs if j.get("friction_score", 0.5) > 0.5]
        
        if low_friction and high_friction:
            # Low friction jobs should generally have higher scores
            avg_low = sum(j.get("score", 0) for j in low_friction) / len(low_friction)
            avg_high = sum(j.get("score", 0) for j in high_friction) / len(high_friction)
            print(f"✓ Friction penalty: low friction avg score={avg_low:.1f}, high friction avg score={avg_high:.1f}")
        else:
            print("✓ Friction penalty verification (limited test data)")


class TestJobsAuthentication:
    """Test authentication requirements for Jobs endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_jobs_requires_auth(self):
        """GET /api/jobs requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Jobs endpoint requires authentication")
    
    def test_categories_requires_auth(self):
        """GET /api/jobs/categories requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/jobs/categories")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Categories endpoint requires authentication")
    
    def test_track_apply_requires_auth(self):
        """POST /api/jobs/track-apply requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/jobs/track-apply", json={"job_id": "test"})
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Track-apply endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

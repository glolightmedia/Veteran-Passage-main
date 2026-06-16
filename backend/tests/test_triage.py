"""
Test Suite for Sprint 2: Triage Engine API
Tests triage tier calculation, resource filtering, and navigator endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OTH_VETERAN = {"email": "testvet@test.com", "password": "TestPass123"}  # discharge: oth = yellow tier
ADMIN = {"email": "admin@veteranpassage.org", "password": os.environ.get("ADMIN_PASSWORD", "")}
SUPERADMIN = {"email": os.environ.get("SUPERADMIN_EMAIL", "glolightmedia@gmail.com"), "password": os.environ.get("SUPERADMIN_PASSWORD", "")}


class TestTriageMyTier:
    """Tests for GET /api/triage/my-tier endpoint"""
    
    def test_oth_veteran_gets_yellow_tier(self):
        """OTH discharge user should get yellow tier"""
        session = requests.Session()
        
        # Login as OTH veteran
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        # Get tier info
        tier_resp = session.get(f"{BASE_URL}/api/triage/my-tier")
        assert tier_resp.status_code == 200, f"Get tier failed: {tier_resp.text}"
        
        data = tier_resp.json()
        assert data["discharge"] == "oth", f"Expected discharge 'oth', got {data.get('discharge')}"
        assert data["tier"] == "yellow", f"Expected tier 'yellow', got {data.get('tier')}"
        assert data["label"] == "Case-by-Case", f"Expected label 'Case-by-Case', got {data.get('label')}"
        assert "description" in data
        assert "recommendation" in data
        
    def test_admin_gets_green_tier_by_default(self):
        """Admin without discharge set should default to green tier"""
        session = requests.Session()
        
        # Login as admin
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        # Get tier info
        tier_resp = session.get(f"{BASE_URL}/api/triage/my-tier")
        assert tier_resp.status_code == 200, f"Get tier failed: {tier_resp.text}"
        
        data = tier_resp.json()
        # Admin may not have discharge set, should default to green
        assert data["tier"] == "green", f"Expected tier 'green', got {data.get('tier')}"
        assert data["label"] == "Full Access"
        
    def test_unauthenticated_request_fails(self):
        """Unauthenticated request should fail"""
        resp = requests.get(f"{BASE_URL}/api/triage/my-tier")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


class TestTriageResources:
    """Tests for GET /api/triage/resources endpoint"""
    
    def test_get_resources_returns_provider_resources(self):
        """Should return provider-submitted resources with tier info"""
        session = requests.Session()
        
        # Login as OTH veteran
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200
        
        # Get resources
        resp = session.get(f"{BASE_URL}/api/triage/resources")
        assert resp.status_code == 200, f"Get resources failed: {resp.text}"
        
        data = resp.json()
        assert "user_tier" in data
        assert data["user_tier"] == "yellow"
        assert "tier_info" in data
        assert "resources" in data
        assert "total" in data
        assert isinstance(data["resources"], list)
        
    def test_resources_have_tiers_array(self):
        """Each resource should have a tiers array"""
        session = requests.Session()
        
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200
        
        resp = session.get(f"{BASE_URL}/api/triage/resources")
        assert resp.status_code == 200
        
        data = resp.json()
        for resource in data["resources"]:
            assert "tiers" in resource, f"Resource missing tiers: {resource.get('name')}"
            assert isinstance(resource["tiers"], list)
            
    def test_category_filter_works(self):
        """Category filter should filter resources"""
        session = requests.Session()
        
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200
        
        # Get all resources
        all_resp = session.get(f"{BASE_URL}/api/triage/resources")
        assert all_resp.status_code == 200
        
        # Get filtered resources
        filtered_resp = session.get(f"{BASE_URL}/api/triage/resources?category=legal")
        assert filtered_resp.status_code == 200
        
        # Filtered should be subset or equal
        all_data = all_resp.json()
        filtered_data = filtered_resp.json()
        assert filtered_data["total"] <= all_data["total"]
        
    def test_unauthenticated_request_fails(self):
        """Unauthenticated request should fail"""
        resp = requests.get(f"{BASE_URL}/api/triage/resources")
        assert resp.status_code == 401


class TestTriageNavigator:
    """Tests for GET /api/triage/navigator endpoint"""
    
    def test_navigator_returns_tier_info(self):
        """Navigator should return user tier info"""
        session = requests.Session()
        
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200
        
        resp = session.get(f"{BASE_URL}/api/triage/navigator?needs=legal,employment")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["user_tier"] == "yellow"
        assert "tier_info" in data
        assert "needs" in data
        assert "legal" in data["needs"]
        assert "employment" in data["needs"]
        
    def test_navigator_with_situation(self):
        """Navigator should accept situation parameter"""
        session = requests.Session()
        
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200
        
        resp = session.get(f"{BASE_URL}/api/triage/navigator?needs=housing&situation=immediate")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["situation"] == "immediate"


class TestSuperadminAccess:
    """Tests for superadmin account access"""
    
    def test_superadmin_can_login(self):
        """Superadmin (Shawn) should be able to login"""
        session = requests.Session()
        
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN)
        assert login_resp.status_code == 200, f"Superadmin login failed: {login_resp.text}"
        
        data = login_resp.json()
        # Login response returns user data directly (not nested under "user")
        assert "email" in data, f"Expected email in response, got: {data}"
        assert data["email"] == SUPERADMIN["email"]
        
    def test_superadmin_can_access_admin_panel(self):
        """Superadmin should have admin role and access admin endpoints"""
        session = requests.Session()
        
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN)
        assert login_resp.status_code == 200
        
        data = login_resp.json()
        # Login response returns user data directly
        assert data["role"] == "admin", f"Expected role 'admin', got {data.get('role')}"
        
        # Try accessing admin endpoint
        users_resp = session.get(f"{BASE_URL}/api/admin/users?limit=10")
        assert users_resp.status_code == 200, f"Admin users endpoint failed: {users_resp.text}"
        
        users_data = users_resp.json()
        assert "users" in users_data
        assert isinstance(users_data["users"], list)


class TestDischargeTierMapping:
    """Tests for discharge type to tier mapping"""
    
    def test_tier_mapping_values(self):
        """Verify the tier mapping is correct in the API"""
        session = requests.Session()
        
        # Login as OTH veteran to verify yellow tier
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=OTH_VETERAN)
        assert login_resp.status_code == 200
        
        tier_resp = session.get(f"{BASE_URL}/api/triage/my-tier")
        assert tier_resp.status_code == 200
        
        data = tier_resp.json()
        # OTH should map to yellow
        assert data["tier"] == "yellow"
        
        # Verify tier info structure
        assert "label" in data
        assert "description" in data
        assert "recommendation" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

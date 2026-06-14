"""
Backend API Tests for Veteran Passage
Tests: Auth endpoints (register, login, logout, me, profile, refresh)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = "VetPass2026!"
TEST_USER_EMAIL = "testvet@test.com"
TEST_USER_PASSWORD = "TestPass123"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        print(f"SUCCESS: Health check passed - status: {data['status']}")


class TestAuthLogin:
    """Login endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with correct credentials"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "password_hash" not in data  # Should not expose password hash
        print(f"SUCCESS: Admin login - user id: {data['id']}, role: {data['role']}")
        
        # Verify cookies are set
        cookies = session.cookies.get_dict()
        assert "access_token" in cookies, "access_token cookie not set"
        assert "refresh_token" in cookies, "refresh_token cookie not set"
        print(f"SUCCESS: Auth cookies set correctly")
    
    def test_login_test_user_success(self):
        """Test regular user login with correct credentials"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Test user login failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["email"] == TEST_USER_EMAIL
        # Role can be 'user' (Sprint 1) or 'customer' (Sprint 2 RBAC)
        assert data["role"] in ["user", "customer"], f"Unexpected role: {data['role']}"
        print(f"SUCCESS: Test user login - user id: {data['id']}, role: {data['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Invalid credentials rejected - {data['detail']}")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@test.com", "password": "anypassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Non-existent user login rejected")


class TestAuthRegister:
    """Registration endpoint tests"""
    
    def test_register_new_user(self):
        """Test registering a new user with all 8 discharge types available"""
        unique_email = f"TEST_newuser_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        
        payload = {
            "email": unique_email,
            "password": "TestPass123",
            "full_name": "Test New User",
            "branch": "army",
            "discharge": "honorable",
            "location": "San Diego, CA"
        }
        
        response = session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        # Backend lowercases email
        assert data["email"] == unique_email.lower()
        assert data["full_name"] == "Test New User"
        assert data["branch"] == "army"
        assert data["discharge"] == "honorable"
        assert data["role"] == "user"
        assert "password_hash" not in data
        print(f"SUCCESS: New user registered - id: {data['id']}, email: {data['email']}")
        
        # Verify cookies are set after registration
        cookies = session.cookies.get_dict()
        assert "access_token" in cookies, "access_token cookie not set after registration"
        print("SUCCESS: Auth cookies set after registration")
    
    def test_register_with_oth_discharge(self):
        """Test registering with OTH discharge (Kindling mode trigger)"""
        unique_email = f"TEST_oth_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123",
            "full_name": "OTH Test User",
            "branch": "marines",
            "discharge": "oth",
            "location": "Austin, TX"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"OTH registration failed: {response.text}"
        
        data = response.json()
        assert data["discharge"] == "oth"
        print(f"SUCCESS: OTH discharge user registered - discharge: {data['discharge']}")
    
    def test_register_duplicate_email(self):
        """Test registering with existing email fails"""
        payload = {
            "email": ADMIN_EMAIL,  # Already exists
            "password": "TestPass123",
            "full_name": "Duplicate User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "already exists" in data["detail"].lower()
        print(f"SUCCESS: Duplicate email rejected - {data['detail']}")
    
    def test_register_invalid_email_format(self):
        """Test registering with invalid email format"""
        payload = {
            "email": "notanemail",
            "password": "TestPass123",
            "full_name": "Invalid Email User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Invalid email format rejected")
    
    def test_register_short_password(self):
        """Test registering with password less than 6 chars"""
        unique_email = f"TEST_shortpw_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": unique_email,
            "password": "12345",  # Less than 6 chars
            "full_name": "Short Password User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Short password rejected")


class TestAuthMe:
    """GET /api/auth/me endpoint tests"""
    
    def test_me_authenticated(self):
        """Test /me returns user data when authenticated"""
        session = requests.Session()
        
        # Login first
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Call /me
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"/me failed: {me_response.text}"
        
        data = me_response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "id" in data
        assert "password_hash" not in data
        print(f"SUCCESS: /me returned user data - email: {data['email']}")
    
    def test_me_unauthenticated(self):
        """Test /me returns 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: /me rejected unauthenticated request")


class TestAuthLogout:
    """Logout endpoint tests"""
    
    def test_logout_clears_cookies(self):
        """Test logout clears auth cookies"""
        session = requests.Session()
        
        # Login first
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Verify cookies exist
        cookies_before = session.cookies.get_dict()
        assert "access_token" in cookies_before
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        
        data = logout_response.json()
        assert data["message"] == "Logged out successfully"
        print("SUCCESS: Logout successful")
        
        # Verify /me now fails (cookies should be cleared)
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 401, "Should be unauthenticated after logout"
        print("SUCCESS: User unauthenticated after logout")


class TestAuthProfile:
    """Profile update endpoint tests"""
    
    def test_update_profile(self):
        """Test PUT /api/auth/profile updates user data"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Update profile
        update_payload = {
            "full_name": "Updated Test Vet",
            "location": "New York, NY"
        }
        
        update_response = session.put(
            f"{BASE_URL}/api/auth/profile",
            json=update_payload
        )
        assert update_response.status_code == 200, f"Profile update failed: {update_response.text}"
        
        data = update_response.json()
        assert data["full_name"] == "Updated Test Vet"
        assert data["location"] == "New York, NY"
        print(f"SUCCESS: Profile updated - name: {data['full_name']}, location: {data['location']}")
        
        # Verify with GET /me
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        me_data = me_response.json()
        assert me_data["full_name"] == "Updated Test Vet"
        print("SUCCESS: Profile update persisted")
        
        # Restore original values
        session.put(
            f"{BASE_URL}/api/auth/profile",
            json={"full_name": "Test Vet", "location": ""}
        )
    
    def test_update_profile_unauthenticated(self):
        """Test profile update fails when not authenticated"""
        response = requests.put(
            f"{BASE_URL}/api/auth/profile",
            json={"full_name": "Hacker"}
        )
        assert response.status_code == 401
        print("SUCCESS: Profile update rejected for unauthenticated user")


class TestAuthRefresh:
    """Token refresh endpoint tests"""
    
    def test_refresh_token(self):
        """Test POST /api/auth/refresh refreshes access token"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Refresh
        refresh_response = session.post(f"{BASE_URL}/api/auth/refresh")
        assert refresh_response.status_code == 200, f"Refresh failed: {refresh_response.text}"
        
        data = refresh_response.json()
        assert data["message"] == "Token refreshed"
        print("SUCCESS: Token refreshed")
    
    def test_refresh_without_token(self):
        """Test refresh fails without refresh token"""
        response = requests.post(f"{BASE_URL}/api/auth/refresh")
        assert response.status_code == 401
        print("SUCCESS: Refresh rejected without token")


class TestDischargeTypes:
    """Test all 8 discharge types can be registered"""
    
    @pytest.mark.parametrize("discharge_type", [
        "honorable",
        "general",
        "oth",
        "entry-level",
        "bad-conduct-special",
        "bad-conduct-general",
        "dishonorable",
        "dismissal"
    ])
    def test_register_all_discharge_types(self, discharge_type):
        """Test each of the 8 DD-214 discharge types"""
        unique_email = f"TEST_{discharge_type}_{uuid.uuid4().hex[:6]}@test.com"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123",
            "full_name": f"Test {discharge_type}",
            "branch": "navy",
            "discharge": discharge_type
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration with {discharge_type} failed: {response.text}"
        
        data = response.json()
        assert data["discharge"] == discharge_type
        print(f"SUCCESS: Registered user with discharge type: {discharge_type}")


class TestBranches:
    """Test all 6 military branches can be registered"""
    
    @pytest.mark.parametrize("branch", [
        "army",
        "navy",
        "air-force",
        "marines",
        "coast-guard",
        "space-force"
    ])
    def test_register_all_branches(self, branch):
        """Test each of the 6 military branches"""
        unique_email = f"TEST_{branch}_{uuid.uuid4().hex[:6]}@test.com"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123",
            "full_name": f"Test {branch}",
            "branch": branch,
            "discharge": "honorable"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration with {branch} failed: {response.text}"
        
        data = response.json()
        assert data["branch"] == branch
        print(f"SUCCESS: Registered user with branch: {branch}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

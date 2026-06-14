"""
Backend API Tests for Veteran Passage - RBAC & 5 Modules
Tests: RBAC middleware, Admin, Provider, Customer, Interactions, Developer modules
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = "VetPass2026!"
PROVIDER_EMAIL = "provider@swords.org"
PROVIDER_PASSWORD = "ProvPass123"
DEVELOPER_EMAIL = "dev@veteranpassage.org"
DEVELOPER_PASSWORD = "DevPass123"
CUSTOMER_EMAIL = "testvet@test.com"
CUSTOMER_PASSWORD = "TestPass123"

# Existing approved resource ID for testing
APPROVED_RESOURCE_ID = "69d9c4a2c5054d1f0d47e4ab"


class AuthHelper:
    """Helper class for authentication"""
    
    @staticmethod
    def login(email: str, password: str) -> requests.Session:
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code != 200:
            print(f"Login failed for {email}: {response.text}")
        return session, response
    
    @staticmethod
    def create_user_with_role(role: str) -> tuple:
        """Create a test user with specific role (requires admin)"""
        admin_session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        # Register new user
        unique_email = f"TEST_{role}_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123",
                "full_name": f"Test {role.title()} User"
            }
        )
        if reg_response.status_code != 200:
            return None, None, reg_response
        
        user_id = reg_response.json()["id"]
        
        # Update role via admin
        role_response = admin_session.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            json={"role": role}
        )
        
        return unique_email, user_id, role_response


# ============== RBAC & ROLES TESTS ==============

class TestRolesEndpoint:
    """Test GET /api/roles endpoint"""
    
    def test_get_roles_returns_all_roles(self):
        """Test /api/roles returns all 5 roles and their permissions"""
        response = requests.get(f"{BASE_URL}/api/roles")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "roles" in data
        assert "permissions" in data
        
        expected_roles = ["admin", "moderator", "provider", "developer", "customer"]
        assert data["roles"] == expected_roles, f"Expected {expected_roles}, got {data['roles']}"
        
        # Verify each role has permissions
        for role in expected_roles:
            assert role in data["permissions"], f"Missing permissions for {role}"
            assert len(data["permissions"][role]) > 0, f"No permissions for {role}"
        
        print(f"SUCCESS: /api/roles returns all 5 roles with permissions")
        print(f"  Roles: {data['roles']}")


class TestRBACMiddleware:
    """Test RBAC middleware - admin-only endpoints return 403 for non-admin"""
    
    def test_admin_endpoint_returns_403_for_customer(self):
        """Test admin endpoint returns 403 for customer role"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Admin endpoint returns 403 for customer role")
    
    def test_admin_endpoint_returns_403_for_provider(self):
        """Test admin endpoint returns 403 for provider role"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Admin endpoint returns 403 for provider role")
    
    def test_admin_endpoint_returns_403_for_developer(self):
        """Test admin endpoint returns 403 for developer role"""
        session, login_resp = AuthHelper.login(DEVELOPER_EMAIL, DEVELOPER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Developer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Admin endpoint returns 403 for developer role")
    
    def test_admin_endpoint_returns_200_for_admin(self):
        """Test admin endpoint returns 200 for admin role"""
        session, login_resp = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        
        response = session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("SUCCESS: Admin endpoint returns 200 for admin role")


# ============== ADMIN MODULE TESTS ==============

class TestAdminUsers:
    """Test Admin user management endpoints"""
    
    def test_list_users_with_pagination(self):
        """Test GET /api/admin/users lists users with pagination"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = session.get(f"{BASE_URL}/api/admin/users?page=1&limit=10")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert data["page"] == 1
        assert isinstance(data["users"], list)
        
        # Verify user structure
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "id" in user
            assert "email" in user
            assert "password_hash" not in user  # Should not expose password
        
        print(f"SUCCESS: List users - total: {data['total']}, page: {data['page']}, users on page: {len(data['users'])}")
    
    def test_list_users_filter_by_role(self):
        """Test GET /api/admin/users with role filter"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = session.get(f"{BASE_URL}/api/admin/users?role=admin")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        for user in data["users"]:
            assert user.get("role") == "admin", f"Expected admin role, got {user.get('role')}"
        
        print(f"SUCCESS: Filter users by role - found {len(data['users'])} admin users")
    
    def test_change_user_role(self):
        """Test PUT /api/admin/users/{id}/role changes user role"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        # Create a test user first
        unique_email = f"TEST_rolechange_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123",
                "full_name": "Role Change Test"
            }
        )
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        user_id = reg_response.json()["id"]
        
        # Change role to provider
        role_response = session.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            json={"role": "provider"}
        )
        assert role_response.status_code == 200, f"Role change failed: {role_response.text}"
        
        # Verify role changed
        get_response = session.get(f"{BASE_URL}/api/admin/users/{user_id}")
        assert get_response.status_code == 200
        assert get_response.json()["role"] == "provider"
        
        print(f"SUCCESS: Changed user role to provider")
    
    def test_cannot_change_own_role(self):
        """Test admin cannot change their own role"""
        session, login_resp = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_id = login_resp.json()["id"]
        
        response = session.put(
            f"{BASE_URL}/api/admin/users/{admin_id}/role",
            json={"role": "customer"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Admin cannot change own role")
    
    def test_suspend_user(self):
        """Test PUT /api/admin/users/{id}/suspend suspends/unsuspends user"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        # Create a test user
        unique_email = f"TEST_suspend_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123",
                "full_name": "Suspend Test"
            }
        )
        user_id = reg_response.json()["id"]
        
        # Suspend user
        suspend_response = session.put(
            f"{BASE_URL}/api/admin/users/{user_id}/suspend",
            json={"suspended": True, "reason": "Test suspension"}
        )
        assert suspend_response.status_code == 200, f"Suspend failed: {suspend_response.text}"
        assert "suspended" in suspend_response.json()["message"].lower()
        
        # Unsuspend user
        unsuspend_response = session.put(
            f"{BASE_URL}/api/admin/users/{user_id}/suspend",
            json={"suspended": False}
        )
        assert unsuspend_response.status_code == 200
        assert "unsuspended" in unsuspend_response.json()["message"].lower()
        
        print("SUCCESS: Suspend/unsuspend user works")


class TestAdminAnalytics:
    """Test Admin analytics endpoint"""
    
    def test_get_analytics(self):
        """Test GET /api/admin/analytics returns user counts, resource stats, revenue"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "users" in data
        assert "resources" in data
        assert "promotions" in data
        assert "revenue" in data
        
        # Verify user stats structure
        assert "total" in data["users"]
        assert "by_role" in data["users"]
        
        # Verify resource stats structure
        assert "total" in data["resources"]
        assert "pending" in data["resources"]
        assert "approved" in data["resources"]
        
        print(f"SUCCESS: Analytics - users: {data['users']['total']}, resources: {data['resources']['total']}, revenue: {data['revenue']['total']}")


class TestAdminResources:
    """Test Admin resource approval endpoints"""
    
    def test_get_pending_resources(self):
        """Test GET /api/admin/resources/pending lists pending resources"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = session.get(f"{BASE_URL}/api/admin/resources/pending")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "resources" in data
        assert isinstance(data["resources"], list)
        
        # Verify all resources are pending
        for resource in data["resources"]:
            assert resource.get("status") == "pending", f"Expected pending, got {resource.get('status')}"
        
        print(f"SUCCESS: Get pending resources - found {len(data['resources'])} pending")
    
    def test_approve_resource(self):
        """Test PUT /api/admin/resources/{id}/approve approves resource"""
        # First create a resource as provider
        provider_session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        # Create resource
        create_response = provider_session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Resource {uuid.uuid4().hex[:6]}",
                "description": "Test resource for approval testing - minimum 10 chars",
                "categories": ["housing"],
                "url": "https://test.com"
            }
        )
        if create_response.status_code != 200:
            pytest.skip(f"Resource creation failed: {create_response.text}")
        
        resource_id = create_response.json()["id"]
        
        # Approve as admin
        admin_session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        approve_response = admin_session.put(f"{BASE_URL}/api/admin/resources/{resource_id}/approve")
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        assert "approved" in approve_response.json()["message"].lower()
        
        print(f"SUCCESS: Resource approved - id: {resource_id}")
    
    def test_reject_resource(self):
        """Test PUT /api/admin/resources/{id}/reject rejects resource"""
        # Create a resource as provider
        provider_session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        create_response = provider_session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Reject Resource {uuid.uuid4().hex[:6]}",
                "description": "Test resource for rejection testing - minimum 10 chars",
                "categories": ["employment"],
                "url": "https://test.com"
            }
        )
        if create_response.status_code != 200:
            pytest.skip(f"Resource creation failed: {create_response.text}")
        
        resource_id = create_response.json()["id"]
        
        # Reject as admin
        admin_session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        reject_response = admin_session.put(f"{BASE_URL}/api/admin/resources/{resource_id}/reject")
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        assert "rejected" in reject_response.json()["message"].lower()
        
        print(f"SUCCESS: Resource rejected - id: {resource_id}")


# ============== PROVIDER MODULE TESTS ==============

class TestProviderResources:
    """Test Provider resource management endpoints"""
    
    def test_create_resource_pending_status(self):
        """Test POST /api/provider/resources creates resource with pending status"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        response = session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Provider Resource {uuid.uuid4().hex[:6]}",
                "description": "Test resource created by provider - minimum 10 chars required",
                "categories": ["healthcare", "mental-health"],
                "eligibility": "All veterans",
                "url": "https://provider-test.com",
                "phone": "555-123-4567"
            }
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending", f"Expected pending, got {data['status']}"
        assert data["name"].startswith("TEST Provider Resource")
        
        print(f"SUCCESS: Provider created resource with pending status - id: {data['id']}")
        return data["id"]
    
    def test_update_own_resource(self):
        """Test PUT /api/provider/resources/{id} updates own resource"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        # Create resource first
        create_response = session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Update Resource {uuid.uuid4().hex[:6]}",
                "description": "Original description - minimum 10 chars",
                "categories": ["housing"],
                "url": "https://original.com"
            }
        )
        resource_id = create_response.json()["id"]
        
        # Update resource
        update_response = session.put(
            f"{BASE_URL}/api/provider/resources/{resource_id}",
            json={
                "description": "Updated description - minimum 10 chars",
                "phone": "555-999-8888"
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        data = update_response.json()
        assert "Updated description" in data["description"]
        assert data["phone"] == "555-999-8888"
        
        print(f"SUCCESS: Provider updated own resource")
    
    def test_delete_own_resource(self):
        """Test DELETE /api/provider/resources/{id} deletes own resource"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        # Create resource first
        create_response = session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Delete Resource {uuid.uuid4().hex[:6]}",
                "description": "Resource to be deleted - minimum 10 chars",
                "categories": ["education"],
                "url": "https://delete-me.com"
            }
        )
        resource_id = create_response.json()["id"]
        
        # Delete resource
        delete_response = session.delete(f"{BASE_URL}/api/provider/resources/{resource_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert "deleted" in delete_response.json()["message"].lower()
        
        print(f"SUCCESS: Provider deleted own resource")
    
    def test_cannot_update_others_resource(self):
        """Test provider cannot update another provider's resource"""
        # Create resource as admin (different provider)
        admin_session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        create_response = admin_session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Admin Resource {uuid.uuid4().hex[:6]}",
                "description": "Admin created resource - minimum 10 chars",
                "categories": ["housing"],
                "url": "https://admin-resource.com"
            }
        )
        if create_response.status_code != 200:
            pytest.skip(f"Admin resource creation failed: {create_response.text}")
        
        resource_id = create_response.json()["id"]
        
        # Try to update as provider
        provider_session, _ = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        update_response = provider_session.put(
            f"{BASE_URL}/api/provider/resources/{resource_id}",
            json={"description": "Hacked description"}
        )
        assert update_response.status_code == 403, f"Expected 403, got {update_response.status_code}"
        
        print("SUCCESS: Provider cannot update others' resources")


class TestProviderPromotions:
    """Test Provider promotion endpoints"""
    
    def test_get_promotion_plans(self):
        """Test GET /api/provider/promotions/plans returns 3 plans with prices"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/provider/promotions/plans")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "plans" in data
        
        plans = data["plans"]
        assert "basic" in plans
        assert "premium" in plans
        assert "featured" in plans
        
        # Verify plan structure
        for plan_name, plan_data in plans.items():
            assert "price" in plan_data
            assert "duration_days" in plan_data
            assert "label" in plan_data
            assert "badge" in plan_data
        
        print(f"SUCCESS: Got 3 promotion plans - basic: ${plans['basic']['price']}, premium: ${plans['premium']['price']}, featured: ${plans['featured']['price']}")
    
    def test_create_promotion_checkout(self):
        """Test POST /api/provider/promotions/checkout creates Stripe checkout"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        # First create and approve a resource
        create_response = session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Promo Resource {uuid.uuid4().hex[:6]}",
                "description": "Resource for promotion checkout test - minimum 10 chars",
                "categories": ["healthcare"],
                "url": "https://promo-test.com"
            }
        )
        if create_response.status_code != 200:
            pytest.skip(f"Resource creation failed: {create_response.text}")
        
        resource_id = create_response.json()["id"]
        
        # Approve resource as admin
        admin_session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_session.put(f"{BASE_URL}/api/admin/resources/{resource_id}/approve")
        
        # Create checkout as provider
        checkout_response = session.post(
            f"{BASE_URL}/api/provider/promotions/checkout",
            json={
                "resource_id": resource_id,
                "plan": "basic"
            }
        )
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        
        data = checkout_response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com") or "stripe" in data["url"].lower()
        
        print(f"SUCCESS: Created Stripe checkout session - session_id: {data['session_id'][:20]}...")
    
    def test_checkout_requires_approved_resource(self):
        """Test checkout fails for non-approved resource"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        # Create resource (will be pending)
        create_response = session.post(
            f"{BASE_URL}/api/provider/resources",
            json={
                "name": f"TEST Pending Promo {uuid.uuid4().hex[:6]}",
                "description": "Pending resource for checkout test - minimum 10 chars",
                "categories": ["housing"],
                "url": "https://pending-promo.com"
            }
        )
        resource_id = create_response.json()["id"]
        
        # Try checkout on pending resource
        checkout_response = session.post(
            f"{BASE_URL}/api/provider/promotions/checkout",
            json={
                "resource_id": resource_id,
                "plan": "basic"
            }
        )
        assert checkout_response.status_code == 400, f"Expected 400, got {checkout_response.status_code}"
        assert "approved" in checkout_response.json()["detail"].lower()
        
        print("SUCCESS: Checkout requires approved resource")


class TestProviderAnalytics:
    """Test Provider analytics endpoint"""
    
    def test_get_provider_analytics(self):
        """Test GET /api/provider/analytics returns provider stats"""
        session, login_resp = AuthHelper.login(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Provider login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/provider/analytics")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "resources" in data
        assert "promotions" in data
        assert "engagement" in data
        
        assert "total" in data["resources"]
        assert "approved" in data["resources"]
        assert "active" in data["promotions"]
        assert "views" in data["engagement"]
        
        print(f"SUCCESS: Provider analytics - resources: {data['resources']['total']}, approved: {data['resources']['approved']}")


# ============== CUSTOMER MODULE TESTS ==============

class TestCustomerSavedResources:
    """Test Customer saved resources endpoints"""
    
    def test_save_resource_toggle(self):
        """Test POST /api/customer/resources/{id}/save toggles save/unsave"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        # Use existing approved resource or create one
        resource_id = APPROVED_RESOURCE_ID
        
        # Save resource
        save_response = session.post(f"{BASE_URL}/api/customer/resources/{resource_id}/save")
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        
        data = save_response.json()
        assert "saved" in data
        first_state = data["saved"]
        
        # Toggle again
        toggle_response = session.post(f"{BASE_URL}/api/customer/resources/{resource_id}/save")
        assert toggle_response.status_code == 200
        
        toggle_data = toggle_response.json()
        assert toggle_data["saved"] != first_state, "Toggle should change saved state"
        
        print(f"SUCCESS: Save resource toggle works - first: {first_state}, after toggle: {toggle_data['saved']}")
    
    def test_get_saved_resources(self):
        """Test GET /api/customer/saved-resources returns saved resources"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/customer/saved-resources")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "resources" in data
        assert isinstance(data["resources"], list)
        
        print(f"SUCCESS: Get saved resources - found {len(data['resources'])} saved")


class TestCustomerActivity:
    """Test Customer activity endpoints"""
    
    def test_get_activity_history(self):
        """Test GET /api/customer/activity returns activity history"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/customer/activity")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "activities" in data
        assert "total" in data
        assert "page" in data
        
        print(f"SUCCESS: Get activity history - total: {data['total']}")
    
    def test_log_activity(self):
        """Test POST /api/customer/activity/log logs an activity"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.post(
            f"{BASE_URL}/api/customer/activity/log",
            json={
                "action": "resource_view",
                "resource_id": APPROVED_RESOURCE_ID,
                "metadata": {"source": "test"}
            }
        )
        assert response.status_code == 200, f"Log failed: {response.text}"
        assert "logged" in response.json()["message"].lower()
        
        print("SUCCESS: Activity logged")
    
    def test_log_activity_requires_action(self):
        """Test activity log requires action field"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.post(
            f"{BASE_URL}/api/customer/activity/log",
            json={"metadata": {"test": True}}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("SUCCESS: Activity log requires action field")


# ============== INTERACTIONS MODULE TESTS ==============

class TestInteractionsActivity:
    """Test Interactions activity endpoints (admin/mod only)"""
    
    def test_get_all_activity_admin(self):
        """Test GET /api/interactions/activity returns all activity (admin only)"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = session.get(f"{BASE_URL}/api/interactions/activity")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "activities" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        print(f"SUCCESS: Admin can view all activity - total: {data['total']}")
    
    def test_get_all_activity_denied_for_customer(self):
        """Test GET /api/interactions/activity denied for customer"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/interactions/activity")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print("SUCCESS: Customer cannot view all activity")


class TestInteractionsReports:
    """Test Interactions moderation reports endpoints"""
    
    def test_create_moderation_report(self):
        """Test POST /api/interactions/reports creates moderation report"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.post(
            f"{BASE_URL}/api/interactions/reports",
            json={
                "target_type": "resource",
                "target_id": APPROVED_RESOURCE_ID,
                "reason": "Test report - inappropriate content for testing purposes"
            }
        )
        assert response.status_code == 200, f"Create report failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        assert data["target_type"] == "resource"
        
        print(f"SUCCESS: Created moderation report - id: {data['id']}")
        return data["id"]
    
    def test_list_reports_admin_only(self):
        """Test GET /api/interactions/reports lists reports (admin/mod only)"""
        session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = session.get(f"{BASE_URL}/api/interactions/reports")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "reports" in data
        assert "total" in data
        
        print(f"SUCCESS: Admin can list reports - total: {data['total']}")
    
    def test_list_reports_denied_for_customer(self):
        """Test GET /api/interactions/reports denied for customer"""
        session, login_resp = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/interactions/reports")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print("SUCCESS: Customer cannot list reports")
    
    def test_resolve_report(self):
        """Test PUT /api/interactions/reports/{id} resolves report"""
        # Create report as customer
        customer_session, _ = AuthHelper.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        create_response = customer_session.post(
            f"{BASE_URL}/api/interactions/reports",
            json={
                "target_type": "resource",
                "target_id": APPROVED_RESOURCE_ID,
                "reason": "Test report for resolution - minimum 5 chars"
            }
        )
        if create_response.status_code != 200:
            pytest.skip(f"Report creation failed: {create_response.text}")
        
        report_id = create_response.json()["id"]
        
        # Resolve as admin
        admin_session, _ = AuthHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        resolve_response = admin_session.put(
            f"{BASE_URL}/api/interactions/reports/{report_id}",
            json={
                "action": "dismiss",
                "notes": "Test dismissal - no violation found"
            }
        )
        assert resolve_response.status_code == 200, f"Resolve failed: {resolve_response.text}"
        assert "resolved" in resolve_response.json()["message"].lower()
        
        print(f"SUCCESS: Report resolved - id: {report_id}")


# ============== DEVELOPER MODULE TESTS ==============

class TestDeveloperApiKeys:
    """Test Developer API key management endpoints"""
    
    def test_create_api_key(self):
        """Test POST /api/developer/api-keys creates API key"""
        session, login_resp = AuthHelper.login(DEVELOPER_EMAIL, DEVELOPER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Developer login failed: {login_resp.text}")
        
        response = session.post(
            f"{BASE_URL}/api/developer/api-keys",
            json={
                "name": f"TEST Key {uuid.uuid4().hex[:6]}",
                "description": "Test API key for testing"
            }
        )
        assert response.status_code == 200, f"Create key failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "api_key" in data
        assert "key_prefix" in data
        assert data["api_key"].startswith("vp_")
        assert "Store this key securely" in data["message"]
        
        print(f"SUCCESS: Created API key - prefix: {data['key_prefix']}")
        return data["api_key"]
    
    def test_list_api_keys(self):
        """Test GET /api/developer/api-keys lists keys"""
        session, login_resp = AuthHelper.login(DEVELOPER_EMAIL, DEVELOPER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Developer login failed: {login_resp.text}")
        
        response = session.get(f"{BASE_URL}/api/developer/api-keys")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "api_keys" in data
        assert isinstance(data["api_keys"], list)
        
        # Verify key structure (should not expose full key)
        if len(data["api_keys"]) > 0:
            key = data["api_keys"][0]
            assert "id" in key
            assert "name" in key
            assert "key_prefix" in key
            assert "api_key" not in key  # Full key should not be exposed
        
        print(f"SUCCESS: List API keys - found {len(data['api_keys'])} keys")
    
    def test_revoke_api_key(self):
        """Test DELETE /api/developer/api-keys/{id} revokes key"""
        session, login_resp = AuthHelper.login(DEVELOPER_EMAIL, DEVELOPER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Developer login failed: {login_resp.text}")
        
        # Create key first
        create_response = session.post(
            f"{BASE_URL}/api/developer/api-keys",
            json={"name": f"TEST Revoke Key {uuid.uuid4().hex[:6]}"}
        )
        key_id = create_response.json()["id"]
        
        # Revoke key
        revoke_response = session.delete(f"{BASE_URL}/api/developer/api-keys/{key_id}")
        assert revoke_response.status_code == 200, f"Revoke failed: {revoke_response.text}"
        assert "revoked" in revoke_response.json()["message"].lower()
        
        print(f"SUCCESS: API key revoked - id: {key_id}")


class TestDeveloperPublicApi:
    """Test Developer public API endpoints"""
    
    def test_public_resources_with_api_key(self):
        """Test GET /api/developer/public/resources returns resources via API key"""
        # First create an API key
        session, login_resp = AuthHelper.login(DEVELOPER_EMAIL, DEVELOPER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Developer login failed: {login_resp.text}")
        
        create_response = session.post(
            f"{BASE_URL}/api/developer/api-keys",
            json={"name": f"TEST Public API Key {uuid.uuid4().hex[:6]}"}
        )
        api_key = create_response.json()["api_key"]
        
        # Use API key to access public resources
        response = requests.get(
            f"{BASE_URL}/api/developer/public/resources",
            headers={"X-API-Key": api_key}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "resources" in data
        assert "count" in data
        
        print(f"SUCCESS: Public API returned {data['count']} resources")
    
    def test_public_resources_without_api_key(self):
        """Test public resources requires API key"""
        response = requests.get(f"{BASE_URL}/api/developer/public/resources")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "API key required" in response.json()["detail"]
        
        print("SUCCESS: Public API requires API key")
    
    def test_public_resources_with_invalid_key(self):
        """Test public resources rejects invalid API key"""
        response = requests.get(
            f"{BASE_URL}/api/developer/public/resources",
            headers={"X-API-Key": "vp_invalid_key_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("SUCCESS: Public API rejects invalid key")
    
    def test_public_resources_with_revoked_key(self):
        """Test public resources rejects revoked API key"""
        # Create and revoke a key
        session, login_resp = AuthHelper.login(DEVELOPER_EMAIL, DEVELOPER_PASSWORD)
        if login_resp.status_code != 200:
            pytest.skip(f"Developer login failed: {login_resp.text}")
        
        create_response = session.post(
            f"{BASE_URL}/api/developer/api-keys",
            json={"name": f"TEST Revoked Key {uuid.uuid4().hex[:6]}"}
        )
        api_key = create_response.json()["api_key"]
        key_id = create_response.json()["id"]
        
        # Revoke the key
        session.delete(f"{BASE_URL}/api/developer/api-keys/{key_id}")
        
        # Try to use revoked key
        response = requests.get(
            f"{BASE_URL}/api/developer/public/resources",
            headers={"X-API-Key": api_key}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("SUCCESS: Public API rejects revoked key")


# ============== STRIPE WEBHOOK TEST ==============

class TestStripeWebhook:
    """Test Stripe webhook endpoint"""
    
    def test_webhook_endpoint_exists(self):
        """Test POST /api/webhook/stripe endpoint exists"""
        # Just verify the endpoint exists and handles requests
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b"test",
            headers={"Content-Type": "application/json"}
        )
        # Should return error (no valid signature) but not 404
        assert response.status_code != 404, "Webhook endpoint not found"
        print(f"SUCCESS: Stripe webhook endpoint exists - status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

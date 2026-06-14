"""
Superadmin Command Center API Tests
Tests for Blog CRUD, Announcements CRUD, User Management, Deep Analytics, Audit Log, and Global Content Management
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "glolightmedia@gmail.com"
SUPERADMIN_PASSWORD = "M@rinecorp1"
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = "VetPass2026!"
CUSTOMER_EMAIL = "testvet@test.com"
CUSTOMER_PASSWORD = "TestPass123"


class TestSuperadminAuth:
    """Test authentication and RBAC for superadmin endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Get authenticated customer session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        return session
    
    def test_superadmin_login(self, admin_session):
        """Test superadmin can login"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "admin"
        print(f"Admin logged in: {data.get('email')}")
    
    def test_customer_cannot_access_superadmin_endpoints(self, customer_session):
        """Test RBAC: customer gets 403 on superadmin endpoints"""
        endpoints = [
            "/api/superadmin/blog",
            "/api/superadmin/announcements",
            "/api/superadmin/analytics/deep",
            "/api/superadmin/audit-log",
            "/api/superadmin/all-jobs",
            "/api/superadmin/all-forum-posts",
            "/api/superadmin/all-mentorship",
            "/api/superadmin/all-transactions",
            "/api/superadmin/all-api-keys",
        ]
        for endpoint in endpoints:
            response = customer_session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 403, f"Expected 403 for {endpoint}, got {response.status_code}"
            print(f"RBAC OK: {endpoint} returns 403 for customer")


class TestBlogCRUD:
    """Test Blog CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture(scope="class")
    def test_blog_id(self, admin_session):
        """Create a test blog post and return its ID"""
        response = admin_session.post(f"{BASE_URL}/api/superadmin/blog", json={
            "title": "TEST_Blog Post for Testing",
            "slug": "test-blog-post-testing",
            "content": "This is test content for the blog post.",
            "excerpt": "Test excerpt",
            "category": "general",
            "tags": ["test", "automation"],
            "status": "draft"
        })
        assert response.status_code == 200, f"Failed to create blog: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created test blog post: {data['id']}")
        return data["id"]
    
    def test_list_blog_posts(self, admin_session):
        """Test GET /api/superadmin/blog"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/blog")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"Blog posts: {data['total']} total")
    
    def test_create_blog_post(self, admin_session):
        """Test POST /api/superadmin/blog"""
        response = admin_session.post(f"{BASE_URL}/api/superadmin/blog", json={
            "title": "TEST_New Blog Post",
            "slug": "test-new-blog-post",
            "content": "Content for the new blog post.",
            "excerpt": "Short excerpt",
            "category": "news",
            "tags": ["test"],
            "status": "published"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_New Blog Post"
        assert data["status"] == "published"
        assert "id" in data
        assert "published_at" in data  # Should be set for published posts
        print(f"Created blog post: {data['id']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/superadmin/blog/{data['id']}")
    
    def test_update_blog_post(self, admin_session, test_blog_id):
        """Test PUT /api/superadmin/blog/{id}"""
        response = admin_session.put(f"{BASE_URL}/api/superadmin/blog/{test_blog_id}", json={
            "title": "TEST_Updated Blog Title",
            "status": "published"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Updated Blog Title"
        assert data["status"] == "published"
        print(f"Updated blog post: {test_blog_id}")
    
    def test_delete_blog_post(self, admin_session, test_blog_id):
        """Test DELETE /api/superadmin/blog/{id}"""
        response = admin_session.delete(f"{BASE_URL}/api/superadmin/blog/{test_blog_id}")
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower() or "message" in data
        print(f"Deleted blog post: {test_blog_id}")
        
        # Verify deletion
        response = admin_session.get(f"{BASE_URL}/api/superadmin/blog")
        posts = response.json().get("posts", [])
        assert not any(p["id"] == test_blog_id for p in posts)


class TestPublicBlog:
    """Test public blog endpoints (no auth required)"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_public_blog_list(self):
        """Test GET /api/superadmin/blog/public (no auth)"""
        response = requests.get(f"{BASE_URL}/api/superadmin/blog/public")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"Public blog posts: {data['total']} published")
    
    def test_public_blog_by_slug(self, admin_session):
        """Test GET /api/superadmin/blog/public/{slug}"""
        # First create a published post
        create_resp = admin_session.post(f"{BASE_URL}/api/superadmin/blog", json={
            "title": "TEST_Public Blog Post",
            "slug": "test-public-blog-slug",
            "content": "Public content here.",
            "status": "published"
        })
        assert create_resp.status_code == 200
        post_id = create_resp.json()["id"]
        
        # Access without auth
        response = requests.get(f"{BASE_URL}/api/superadmin/blog/public/test-public-blog-slug")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Public Blog Post"
        print(f"Public blog by slug works: {data['slug']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/superadmin/blog/{post_id}")


class TestAnnouncementsCRUD:
    """Test Announcements CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture(scope="class")
    def test_announcement_id(self, admin_session):
        """Create a test announcement"""
        response = admin_session.post(f"{BASE_URL}/api/superadmin/announcements", json={
            "title": "TEST_Announcement",
            "content": "This is a test announcement.",
            "type": "info",
            "active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"Created test announcement: {data['id']}")
        return data["id"]
    
    def test_list_announcements(self, admin_session):
        """Test GET /api/superadmin/announcements"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/announcements")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        print(f"Announcements: {len(data['announcements'])} total")
    
    def test_create_announcement(self, admin_session):
        """Test POST /api/superadmin/announcements"""
        response = admin_session.post(f"{BASE_URL}/api/superadmin/announcements", json={
            "title": "TEST_New Announcement",
            "content": "Important announcement content.",
            "type": "warning",
            "active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_New Announcement"
        assert data["type"] == "warning"
        assert data["active"] == True
        print(f"Created announcement: {data['id']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/superadmin/announcements/{data['id']}")
    
    def test_update_announcement(self, admin_session, test_announcement_id):
        """Test PUT /api/superadmin/announcements/{id}"""
        response = admin_session.put(f"{BASE_URL}/api/superadmin/announcements/{test_announcement_id}", json={
            "title": "TEST_Updated Announcement",
            "active": False
        })
        assert response.status_code == 200
        print(f"Updated announcement: {test_announcement_id}")
    
    def test_delete_announcement(self, admin_session, test_announcement_id):
        """Test DELETE /api/superadmin/announcements/{id}"""
        response = admin_session.delete(f"{BASE_URL}/api/superadmin/announcements/{test_announcement_id}")
        assert response.status_code == 200
        print(f"Deleted announcement: {test_announcement_id}")
    
    def test_active_announcement_public(self, admin_session):
        """Test GET /api/superadmin/announcements/active (public)"""
        # Create an active announcement
        create_resp = admin_session.post(f"{BASE_URL}/api/superadmin/announcements", json={
            "title": "TEST_Active Announcement",
            "content": "Active content",
            "active": True
        })
        assert create_resp.status_code == 200
        ann_id = create_resp.json()["id"]
        
        # Access without auth
        response = requests.get(f"{BASE_URL}/api/superadmin/announcements/active")
        assert response.status_code == 200
        data = response.json()
        # Should return an announcement (may or may not be ours)
        print(f"Active announcement endpoint works: {data}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/superadmin/announcements/{ann_id}")


class TestUserManagement:
    """Test superadmin user management (delete, edit, reset password)"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    @pytest.fixture(scope="class")
    def throwaway_user_id(self, admin_session):
        """Create a throwaway user for testing delete/edit/reset"""
        # Register a new user
        timestamp = int(time.time())
        email = f"TEST_throwaway_{timestamp}@test.com"
        
        # Use a separate session for registration
        reg_session = requests.Session()
        response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123",
            "full_name": "TEST Throwaway User",
            "branch": "Army"
        })
        assert response.status_code in [200, 201], f"Failed to register: {response.text}"
        data = response.json()
        
        # Get user ID directly from registration response
        user_id = data.get("id")
        assert user_id is not None, f"Registration did not return user ID: {data}"
        print(f"Created throwaway user: {user_id} ({email})")
        return user_id
    
    def test_edit_user(self, admin_session, throwaway_user_id):
        """Test PUT /api/superadmin/users/{id}/edit"""
        response = admin_session.put(f"{BASE_URL}/api/superadmin/users/{throwaway_user_id}/edit", json={
            "full_name": "TEST Updated Name",
            "branch": "Navy"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "TEST Updated Name"
        assert data["branch"] == "Navy"
        print(f"Edited user: {throwaway_user_id}")
    
    def test_reset_password(self, admin_session, throwaway_user_id):
        """Test POST /api/superadmin/users/{id}/reset-password"""
        response = admin_session.post(f"{BASE_URL}/api/superadmin/users/{throwaway_user_id}/reset-password", json={
            "new_password": "NewPass123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reset" in data["message"].lower() or "success" in data["message"].lower()
        print(f"Reset password for user: {throwaway_user_id}")
    
    def test_reset_password_validation(self, admin_session, throwaway_user_id):
        """Test password validation (min 6 chars)"""
        response = admin_session.post(f"{BASE_URL}/api/superadmin/users/{throwaway_user_id}/reset-password", json={
            "new_password": "short"
        })
        assert response.status_code == 400
        print("Password validation works: rejected short password")
    
    def test_delete_user(self, admin_session, throwaway_user_id):
        """Test DELETE /api/superadmin/users/{id}"""
        response = admin_session.delete(f"{BASE_URL}/api/superadmin/users/{throwaway_user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower()
        print(f"Deleted user: {throwaway_user_id}")
        
        # Verify user is gone
        users_resp = admin_session.get(f"{BASE_URL}/api/admin/users?limit=100")
        users = users_resp.json().get("users", [])
        assert not any(u["id"] == throwaway_user_id for u in users)


class TestDeepAnalytics:
    """Test deep analytics endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_deep_analytics(self, admin_session):
        """Test GET /api/superadmin/analytics/deep"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/analytics/deep")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected sections
        assert "users" in data
        assert "total" in data["users"]
        assert "by_role" in data["users"]
        assert "recent_signups_30d" in data["users"]
        
        assert "resources" in data
        assert "jobs" in data
        assert "forum" in data
        assert "chat" in data
        assert "mentorship" in data
        assert "revenue" in data
        assert "blog" in data
        assert "moderation" in data
        assert "developer" in data
        
        print(f"Deep analytics: {data['users']['total']} users, {data['forum']['posts']} forum posts")


class TestAuditLog:
    """Test audit log endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_audit_log(self, admin_session):
        """Test GET /api/superadmin/audit-log"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/audit-log")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        print(f"Audit log: {data['total']} entries")
    
    def test_audit_log_filter(self, admin_session):
        """Test audit log with action filter"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/audit-log?action=login")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        print(f"Filtered audit log: {len(data['logs'])} entries matching 'login'")
    
    def test_audit_log_pagination(self, admin_session):
        """Test audit log pagination"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/audit-log?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) <= 10
        print(f"Paginated audit log: page {data['page']}")


class TestGlobalContentManagement:
    """Test global content management endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_all_jobs(self, admin_session):
        """Test GET /api/superadmin/all-jobs"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/all-jobs")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        print(f"All jobs: {data['total']} total")
    
    def test_all_forum_posts(self, admin_session):
        """Test GET /api/superadmin/all-forum-posts"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/all-forum-posts")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"All forum posts: {data['total']} total")
    
    def test_all_mentorship(self, admin_session):
        """Test GET /api/superadmin/all-mentorship"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/all-mentorship")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "total" in data
        print(f"All mentorship requests: {data['total']} total")
    
    def test_all_transactions(self, admin_session):
        """Test GET /api/superadmin/all-transactions"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/all-transactions")
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        print(f"All transactions: {data['total']} total")
    
    def test_all_api_keys(self, admin_session):
        """Test GET /api/superadmin/all-api-keys"""
        response = admin_session.get(f"{BASE_URL}/api/superadmin/all-api-keys")
        assert response.status_code == 200
        data = response.json()
        assert "api_keys" in data
        assert "total" in data
        print(f"All API keys: {data['total']} total")


class TestDeleteJob:
    """Test job deletion from superadmin"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_delete_job(self, admin_session):
        """Test DELETE /api/superadmin/jobs/{id}"""
        # First get list of jobs
        jobs_resp = admin_session.get(f"{BASE_URL}/api/superadmin/all-jobs")
        jobs = jobs_resp.json().get("jobs", [])
        
        if len(jobs) > 0:
            # Find a test job or skip
            test_job = next((j for j in jobs if "TEST" in j.get("title", "")), None)
            if test_job:
                response = admin_session.delete(f"{BASE_URL}/api/superadmin/jobs/{test_job['id']}")
                assert response.status_code == 200
                print(f"Deleted job: {test_job['id']}")
            else:
                print("No TEST jobs to delete, skipping")
        else:
            print("No jobs in system, skipping delete test")


# Cleanup fixture to remove TEST_ prefixed data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    # Login as admin
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        return
    
    # Cleanup blog posts
    try:
        blogs = session.get(f"{BASE_URL}/api/superadmin/blog").json().get("posts", [])
        for b in blogs:
            if "TEST_" in b.get("title", ""):
                session.delete(f"{BASE_URL}/api/superadmin/blog/{b['id']}")
    except:
        pass
    
    # Cleanup announcements
    try:
        anns = session.get(f"{BASE_URL}/api/superadmin/announcements").json().get("announcements", [])
        for a in anns:
            if "TEST_" in a.get("title", ""):
                session.delete(f"{BASE_URL}/api/superadmin/announcements/{a['id']}")
    except:
        pass
    
    print("Cleanup complete")

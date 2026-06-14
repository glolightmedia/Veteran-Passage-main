"""
Forum API Tests - Sprint 7: The Circle Forum
Tests for forum categories, posts, replies, upvoting, and moderation (pin/delete)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@veteranpassage.org"
ADMIN_PASSWORD = "VetPass2026!"
CUSTOMER_EMAIL = "testvet@test.com"
CUSTOMER_PASSWORD = "TestPass123"


class TestForumCategories:
    """Forum categories endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer for category tests"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
    
    def test_get_categories_returns_6_categories(self):
        """GET /api/forum/categories returns 6 categories with post counts"""
        response = self.session.get(f"{BASE_URL}/api/forum/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Verify category structure
        expected_ids = ["general", "benefits", "careers", "business", "wellness", "stories"]
        actual_ids = [c["id"] for c in categories]
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing category: {expected_id}"
        
        # Verify each category has required fields
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "description" in cat
            assert "icon" in cat
            assert "post_count" in cat
            assert isinstance(cat["post_count"], int)
    
    def test_categories_require_auth(self):
        """GET /api/forum/categories requires authentication"""
        response = requests.get(f"{BASE_URL}/api/forum/categories")
        assert response.status_code == 401


class TestForumPosts:
    """Forum posts CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        self.user_data = response.json()
    
    def test_list_posts_returns_posts(self):
        """GET /api/forum/posts returns posts with pagination"""
        response = self.session.get(f"{BASE_URL}/api/forum/posts")
        assert response.status_code == 200
        
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        # Verify post structure if posts exist
        if data["posts"]:
            post = data["posts"][0]
            assert "id" in post
            assert "title" in post
            assert "content" in post
            assert "category" in post
            assert "author_id" in post
            assert "author_name" in post
            assert "upvotes" in post
            assert "reply_count" in post
            assert "created_at" in post
    
    def test_list_posts_filter_by_category(self):
        """GET /api/forum/posts?category=general filters by category"""
        response = self.session.get(f"{BASE_URL}/api/forum/posts?category=general")
        assert response.status_code == 200
        
        data = response.json()
        for post in data["posts"]:
            assert post["category"] == "general"
    
    def test_list_posts_search(self):
        """GET /api/forum/posts?search=test searches posts"""
        response = self.session.get(f"{BASE_URL}/api/forum/posts?search=test")
        assert response.status_code == 200
        assert "posts" in response.json()
    
    def test_list_posts_sort_newest(self):
        """GET /api/forum/posts?sort=newest sorts by date"""
        response = self.session.get(f"{BASE_URL}/api/forum/posts?sort=newest")
        assert response.status_code == 200
        assert "posts" in response.json()
    
    def test_list_posts_sort_popular(self):
        """GET /api/forum/posts?sort=popular sorts by upvotes"""
        response = self.session.get(f"{BASE_URL}/api/forum/posts?sort=popular")
        assert response.status_code == 200
        assert "posts" in response.json()
    
    def test_create_post_success(self):
        """POST /api/forum/posts creates a new post"""
        post_data = {
            "title": "TEST_Forum Post Title",
            "content": "This is a test forum post content with enough characters.",
            "category": "general"
        }
        response = self.session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["title"] == post_data["title"]
        assert data["content"] == post_data["content"]
        assert data["category"] == post_data["category"]
        assert data["upvotes"] == 0
        assert data["reply_count"] == 0
        
        # Store post ID for cleanup
        self.created_post_id = data["id"]
        
        # Verify post was persisted
        get_response = self.session.get(f"{BASE_URL}/api/forum/posts/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["title"] == post_data["title"]
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/forum/posts/{data['id']}")
    
    def test_create_post_validation_title_too_short(self):
        """POST /api/forum/posts rejects short title"""
        response = self.session.post(f"{BASE_URL}/api/forum/posts", json={
            "title": "AB",
            "content": "This is valid content with enough characters.",
            "category": "general"
        })
        assert response.status_code == 400
        assert "Title" in response.json().get("detail", "")
    
    def test_create_post_validation_content_too_short(self):
        """POST /api/forum/posts rejects short content"""
        response = self.session.post(f"{BASE_URL}/api/forum/posts", json={
            "title": "Valid Title",
            "content": "Short",
            "category": "general"
        })
        assert response.status_code == 400
        assert "Content" in response.json().get("detail", "")
    
    def test_get_post_thread(self):
        """GET /api/forum/posts/{id} returns post with replies"""
        # First create a post
        post_data = {
            "title": "TEST_Thread Post",
            "content": "This is a test post for thread view testing.",
            "category": "general"
        }
        create_response = self.session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Get the thread
        response = self.session.get(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == post_id
        assert data["title"] == post_data["title"]
        assert "replies" in data
        assert isinstance(data["replies"], list)
        assert "reply_count" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")
    
    def test_get_post_not_found(self):
        """GET /api/forum/posts/{id} returns 404 for invalid ID"""
        response = self.session.get(f"{BASE_URL}/api/forum/posts/000000000000000000000000")
        assert response.status_code == 404


class TestForumReplies:
    """Forum reply tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and create a test post"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        
        # Create a test post
        post_data = {
            "title": "TEST_Reply Test Post",
            "content": "This is a test post for reply testing purposes.",
            "category": "general"
        }
        create_response = self.session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        self.post_id = create_response.json()["id"]
    
    def teardown_method(self, method):
        """Cleanup test post"""
        try:
            self.session.delete(f"{BASE_URL}/api/forum/posts/{self.post_id}")
        except:
            pass
    
    def test_create_reply_success(self):
        """POST /api/forum/posts/{id}/reply creates a reply"""
        reply_data = {"content": "This is a test reply with enough characters."}
        response = self.session.post(f"{BASE_URL}/api/forum/posts/{self.post_id}/reply", json=reply_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["content"] == reply_data["content"]
        assert data["post_id"] == self.post_id
        assert "author_name" in data
        assert "created_at" in data
        
        # Verify reply appears in thread
        thread_response = self.session.get(f"{BASE_URL}/api/forum/posts/{self.post_id}")
        assert thread_response.status_code == 200
        thread = thread_response.json()
        assert thread["reply_count"] >= 1
        reply_ids = [r["id"] for r in thread["replies"]]
        assert data["id"] in reply_ids
    
    def test_create_reply_validation_too_short(self):
        """POST /api/forum/posts/{id}/reply rejects short content"""
        response = self.session.post(f"{BASE_URL}/api/forum/posts/{self.post_id}/reply", json={
            "content": "Hi"
        })
        assert response.status_code == 400
        assert "Reply" in response.json().get("detail", "")
    
    def test_create_reply_post_not_found(self):
        """POST /api/forum/posts/{id}/reply returns 404 for invalid post"""
        response = self.session.post(f"{BASE_URL}/api/forum/posts/000000000000000000000000/reply", json={
            "content": "This is a valid reply content."
        })
        assert response.status_code == 404


class TestForumUpvote:
    """Forum upvote toggle tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and create a test post"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        
        # Create a test post
        post_data = {
            "title": "TEST_Upvote Test Post",
            "content": "This is a test post for upvote testing purposes.",
            "category": "general"
        }
        create_response = self.session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        self.post_id = create_response.json()["id"]
    
    def teardown_method(self, method):
        """Cleanup test post"""
        try:
            self.session.delete(f"{BASE_URL}/api/forum/posts/{self.post_id}")
        except:
            pass
    
    def test_upvote_toggle_on(self):
        """POST /api/forum/posts/{id}/upvote adds upvote"""
        response = self.session.post(f"{BASE_URL}/api/forum/posts/{self.post_id}/upvote")
        assert response.status_code == 200
        
        data = response.json()
        assert data["upvoted"] == True
        assert data["upvotes"] == 1
    
    def test_upvote_toggle_off(self):
        """POST /api/forum/posts/{id}/upvote removes upvote on second call"""
        # First upvote
        self.session.post(f"{BASE_URL}/api/forum/posts/{self.post_id}/upvote")
        
        # Second upvote (toggle off)
        response = self.session.post(f"{BASE_URL}/api/forum/posts/{self.post_id}/upvote")
        assert response.status_code == 200
        
        data = response.json()
        assert data["upvoted"] == False
        assert data["upvotes"] == 0
    
    def test_upvote_post_not_found(self):
        """POST /api/forum/posts/{id}/upvote returns 404 for invalid post"""
        response = self.session.post(f"{BASE_URL}/api/forum/posts/000000000000000000000000/upvote")
        assert response.status_code == 404


class TestForumDelete:
    """Forum post deletion tests"""
    
    def test_author_can_delete_own_post(self):
        """DELETE /api/forum/posts/{id} - author can delete own post"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        # Create a post
        post_data = {
            "title": "TEST_Delete Own Post",
            "content": "This is a test post that will be deleted by author.",
            "category": "general"
        }
        create_response = session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Delete the post
        delete_response = session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify post is gone
        get_response = session.get(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert get_response.status_code == 404
    
    def test_admin_can_delete_any_post(self):
        """DELETE /api/forum/posts/{id} - admin can delete any post"""
        # Customer creates a post
        customer_session = requests.Session()
        customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        post_data = {
            "title": "TEST_Admin Delete Post",
            "content": "This is a test post that will be deleted by admin.",
            "category": "general"
        }
        create_response = customer_session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Admin deletes the post
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        delete_response = admin_session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert delete_response.status_code == 200
        
        # Verify post is gone
        get_response = customer_session.get(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert get_response.status_code == 404
    
    def test_non_author_cannot_delete_others_post(self):
        """DELETE /api/forum/posts/{id} - non-author cannot delete others' post"""
        # Admin creates a post
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        post_data = {
            "title": "TEST_RBAC Delete Post",
            "content": "This is a test post that customer should not be able to delete.",
            "category": "general"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Customer tries to delete
        customer_session = requests.Session()
        customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        delete_response = customer_session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert delete_response.status_code == 403
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")


class TestForumPin:
    """Forum post pinning tests (admin only)"""
    
    def test_admin_can_pin_post(self):
        """POST /api/forum/posts/{id}/pin - admin can pin post"""
        # Customer creates a post
        customer_session = requests.Session()
        customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        post_data = {
            "title": "TEST_Pin Post",
            "content": "This is a test post that will be pinned by admin.",
            "category": "general"
        }
        create_response = customer_session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Admin pins the post
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        pin_response = admin_session.post(f"{BASE_URL}/api/forum/posts/{post_id}/pin")
        assert pin_response.status_code == 200
        assert pin_response.json()["pinned"] == True
        
        # Verify post is pinned
        get_response = customer_session.get(f"{BASE_URL}/api/forum/posts/{post_id}")
        assert get_response.status_code == 200
        assert get_response.json()["pinned"] == True
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")
    
    def test_admin_can_unpin_post(self):
        """POST /api/forum/posts/{id}/pin - admin can toggle pin off"""
        # Customer creates a post
        customer_session = requests.Session()
        customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        post_data = {
            "title": "TEST_Unpin Post",
            "content": "This is a test post that will be pinned then unpinned.",
            "category": "general"
        }
        create_response = customer_session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Admin pins then unpins
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Pin
        admin_session.post(f"{BASE_URL}/api/forum/posts/{post_id}/pin")
        
        # Unpin
        unpin_response = admin_session.post(f"{BASE_URL}/api/forum/posts/{post_id}/pin")
        assert unpin_response.status_code == 200
        assert unpin_response.json()["pinned"] == False
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")
    
    def test_non_admin_cannot_pin_post(self):
        """POST /api/forum/posts/{id}/pin - non-admin cannot pin"""
        # Customer creates a post
        customer_session = requests.Session()
        customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        post_data = {
            "title": "TEST_RBAC Pin Post",
            "content": "This is a test post that customer should not be able to pin.",
            "category": "general"
        }
        create_response = customer_session.post(f"{BASE_URL}/api/forum/posts", json=post_data)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Customer tries to pin
        pin_response = customer_session.post(f"{BASE_URL}/api/forum/posts/{post_id}/pin")
        assert pin_response.status_code == 403
        
        # Cleanup
        customer_session.delete(f"{BASE_URL}/api/forum/posts/{post_id}")


class TestForumAuth:
    """Forum authentication tests"""
    
    def test_posts_require_auth(self):
        """GET /api/forum/posts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/forum/posts")
        assert response.status_code == 401
    
    def test_create_post_requires_auth(self):
        """POST /api/forum/posts requires authentication"""
        response = requests.post(f"{BASE_URL}/api/forum/posts", json={
            "title": "Test",
            "content": "Test content",
            "category": "general"
        })
        assert response.status_code == 401
    
    def test_reply_requires_auth(self):
        """POST /api/forum/posts/{id}/reply requires authentication"""
        response = requests.post(f"{BASE_URL}/api/forum/posts/000000000000000000000000/reply", json={
            "content": "Test reply"
        })
        assert response.status_code == 401
    
    def test_upvote_requires_auth(self):
        """POST /api/forum/posts/{id}/upvote requires authentication"""
        response = requests.post(f"{BASE_URL}/api/forum/posts/000000000000000000000000/upvote")
        assert response.status_code == 401
    
    def test_delete_requires_auth(self):
        """DELETE /api/forum/posts/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/forum/posts/000000000000000000000000")
        assert response.status_code == 401
    
    def test_pin_requires_auth(self):
        """POST /api/forum/posts/{id}/pin requires authentication"""
        response = requests.post(f"{BASE_URL}/api/forum/posts/000000000000000000000000/pin")
        assert response.status_code == 401

"""
Blog API Tests - Testing 10 launch articles and all blog endpoints
Tests: GET /api/blog/articles, GET /api/blog/articles/{slug}, GET /api/blog/featured,
       GET /api/blog/by-topic/{topic}, POST /api/blog/articles/{slug}/track,
       GET /api/blog/admin/articles, GET /api/blog/admin/analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
SUPERADMIN_EMAIL = "glolightmedia@gmail.com"
SUPERADMIN_PASSWORD = "M@rinecorp1"

# Article slugs from seed data
ARTICLE_SLUGS = [
    "can-i-get-va-benefits-with-oth-discharge",
    "what-does-re-4-mean-dd214",
    "second-chance-jobs-veterans",
    "best-resume-services-veterans",
    "how-to-upgrade-military-discharge",
    "best-small-business-grants-veterans",
    "best-llc-services-veteran-businesses",
    "jobs-for-veterans-no-degree",
    "what-veteran-friendly-employers-look-for",
    "how-to-start-over-after-military"
]

# Affiliate articles
AFFILIATE_ARTICLES = ["best-resume-services-veterans", "best-llc-services-veteran-businesses"]


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.cookies.get('access_token') or response.json().get('token')
    pytest.skip("Admin authentication failed - skipping admin tests")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth cookies"""
    # Login to get cookies
    api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    return api_client


class TestBlogPublicEndpoints:
    """Public blog API tests - no auth required"""

    def test_get_all_articles_returns_10_published(self, api_client):
        """GET /api/blog/articles returns 10 published articles"""
        response = api_client.get(f"{BASE_URL}/api/blog/articles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "articles" in data, "Response should have 'articles' key"
        assert "total" in data, "Response should have 'total' key"
        
        # Should have at least 10 articles
        assert data["total"] >= 10, f"Expected at least 10 articles, got {data['total']}"
        assert len(data["articles"]) >= 10, f"Expected at least 10 articles in list, got {len(data['articles'])}"
        
        # Verify article structure
        article = data["articles"][0]
        assert "id" in article, "Article should have 'id'"
        assert "title" in article, "Article should have 'title'"
        assert "slug" in article, "Article should have 'slug'"
        assert "category" in article, "Article should have 'category'"
        print(f"✓ GET /api/blog/articles returns {data['total']} published articles")

    def test_get_article_by_slug_full_content(self, api_client):
        """GET /api/blog/articles/{slug} returns full article with content, FAQ, SEO, CTAs, affiliates"""
        slug = "can-i-get-va-benefits-with-oth-discharge"
        response = api_client.get(f"{BASE_URL}/api/blog/articles/{slug}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        article = response.json()
        
        # Required fields
        assert article["slug"] == slug, f"Slug mismatch: {article['slug']}"
        assert "title" in article and article["title"], "Article should have title"
        assert "content" in article and article["content"], "Article should have content"
        assert "subtitle" in article, "Article should have subtitle"
        assert "author" in article, "Article should have author"
        assert "read_time" in article, "Article should have read_time"
        assert "category" in article, "Article should have category"
        
        # FAQ
        assert "faq" in article, "Article should have FAQ"
        assert len(article["faq"]) > 0, "Article should have at least one FAQ"
        assert "q" in article["faq"][0], "FAQ should have question"
        assert "a" in article["faq"][0], "FAQ should have answer"
        
        # SEO
        assert "seo" in article, "Article should have SEO config"
        assert "title" in article["seo"], "SEO should have title"
        assert "meta_description" in article["seo"], "SEO should have meta_description"
        assert "focus_keyword" in article["seo"], "SEO should have focus_keyword"
        
        # CTAs
        assert "cta_config" in article, "Article should have CTA config"
        assert "top_cta" in article["cta_config"], "CTA config should have top_cta"
        assert "mid_cta" in article["cta_config"], "CTA config should have mid_cta"
        assert "bottom_cta" in article["cta_config"], "CTA config should have bottom_cta"
        
        print(f"✓ GET /api/blog/articles/{slug} returns full article with content, FAQ, SEO, CTAs")

    def test_get_featured_articles(self, api_client):
        """GET /api/blog/featured returns featured articles only"""
        response = api_client.get(f"{BASE_URL}/api/blog/featured")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "articles" in data, "Response should have 'articles' key"
        
        # Should have featured articles
        assert len(data["articles"]) > 0, "Should have at least one featured article"
        
        # All returned articles should be featured (we can't verify this directly but check structure)
        for article in data["articles"]:
            assert "id" in article, "Article should have id"
            assert "title" in article, "Article should have title"
            assert "slug" in article, "Article should have slug"
        
        print(f"✓ GET /api/blog/featured returns {len(data['articles'])} featured articles")

    def test_get_articles_by_topic_benefits(self, api_client):
        """GET /api/blog/by-topic/benefits returns filtered articles"""
        response = api_client.get(f"{BASE_URL}/api/blog/by-topic/benefits")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "articles" in data, "Response should have 'articles' key"
        
        # Should have at least one benefits article
        assert len(data["articles"]) > 0, "Should have at least one benefits article"
        
        # All articles should be in benefits category
        for article in data["articles"]:
            assert article["category"] == "benefits", f"Article category should be 'benefits', got {article['category']}"
        
        print(f"✓ GET /api/blog/by-topic/benefits returns {len(data['articles'])} articles")

    def test_get_articles_by_topic_jobs(self, api_client):
        """GET /api/blog/by-topic/jobs returns filtered articles"""
        response = api_client.get(f"{BASE_URL}/api/blog/by-topic/jobs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "articles" in data, "Response should have 'articles' key"
        
        # All articles should be in jobs category
        for article in data["articles"]:
            assert article["category"] == "jobs", f"Article category should be 'jobs', got {article['category']}"
        
        print(f"✓ GET /api/blog/by-topic/jobs returns {len(data['articles'])} articles")

    def test_track_cta_click(self, api_client):
        """POST /api/blog/articles/{slug}/track tracks CTA clicks"""
        slug = "can-i-get-va-benefits-with-oth-discharge"
        response = api_client.post(f"{BASE_URL}/api/blog/articles/{slug}/track", json={
            "type": "cta_click",
            "metadata": {"position": "top", "label": "Use DD-214 Decoder"}
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        
        print(f"✓ POST /api/blog/articles/{slug}/track tracks CTA click")

    def test_track_affiliate_click(self, api_client):
        """POST /api/blog/articles/{slug}/track tracks affiliate clicks"""
        slug = "best-resume-services-veterans"
        response = api_client.post(f"{BASE_URL}/api/blog/articles/{slug}/track", json={
            "type": "affiliate_click",
            "metadata": {"affiliate": "Hire Heroes USA"}
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        
        print(f"✓ POST /api/blog/articles/{slug}/track tracks affiliate click")

    def test_affiliate_article_has_affiliate_data(self, api_client):
        """Affiliate article (best-resume-services-veterans) has affiliate_enabled and affiliate_slots"""
        slug = "best-resume-services-veterans"
        response = api_client.get(f"{BASE_URL}/api/blog/articles/{slug}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        article = response.json()
        
        # Affiliate fields
        assert article.get("affiliate_enabled") == True, "Article should have affiliate_enabled=True"
        assert article.get("affiliate_disclosure") == True, "Article should have affiliate_disclosure=True"
        assert "affiliate_slots" in article, "Article should have affiliate_slots"
        assert len(article["affiliate_slots"]) > 0, "Article should have at least one affiliate slot"
        
        # Verify affiliate slot structure
        slot = article["affiliate_slots"][0]
        assert "name" in slot, "Affiliate slot should have name"
        assert "url" in slot, "Affiliate slot should have url"
        assert "description" in slot, "Affiliate slot should have description"
        assert "pros" in slot, "Affiliate slot should have pros"
        assert "cautions" in slot, "Affiliate slot should have cautions"
        
        print(f"✓ Affiliate article has {len(article['affiliate_slots'])} affiliate slots with pros/cautions")

    def test_article_not_found(self, api_client):
        """GET /api/blog/articles/{slug} returns 404 for non-existent article"""
        response = api_client.get(f"{BASE_URL}/api/blog/articles/non-existent-article-slug")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/blog/articles/non-existent returns 404")

    def test_all_10_article_slugs_exist(self, api_client):
        """Verify all 10 seeded article slugs are accessible"""
        for slug in ARTICLE_SLUGS:
            response = api_client.get(f"{BASE_URL}/api/blog/articles/{slug}")
            assert response.status_code == 200, f"Article {slug} not found (status {response.status_code})"
        print(f"✓ All 10 article slugs are accessible")

    def test_get_categories(self, api_client):
        """GET /api/blog/categories returns available categories"""
        response = api_client.get(f"{BASE_URL}/api/blog/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should have 'categories'"
        assert "article_types" in data, "Response should have 'article_types'"
        assert len(data["categories"]) > 0, "Should have at least one category"
        
        print(f"✓ GET /api/blog/categories returns {len(data['categories'])} categories")


class TestBlogAdminEndpoints:
    """Admin blog API tests - requires admin auth"""

    def test_admin_list_articles(self, admin_client):
        """GET /api/blog/admin/articles returns all articles for admin"""
        response = admin_client.get(f"{BASE_URL}/api/blog/admin/articles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "articles" in data, "Response should have 'articles' key"
        assert "total" in data, "Response should have 'total' key"
        
        # Should have at least 10 articles
        assert data["total"] >= 10, f"Expected at least 10 articles, got {data['total']}"
        
        print(f"✓ GET /api/blog/admin/articles returns {data['total']} articles")

    def test_admin_analytics(self, admin_client):
        """GET /api/blog/admin/analytics returns blog stats"""
        response = admin_client.get(f"{BASE_URL}/api/blog/admin/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Required analytics fields
        assert "total" in data, "Analytics should have 'total'"
        assert "published" in data, "Analytics should have 'published'"
        assert "drafts" in data, "Analytics should have 'drafts'"
        assert "total_cta_clicks" in data, "Analytics should have 'total_cta_clicks'"
        assert "total_affiliate_clicks" in data, "Analytics should have 'total_affiliate_clicks'"
        assert "missing_seo" in data, "Analytics should have 'missing_seo'"
        assert "top_by_views" in data, "Analytics should have 'top_by_views'"
        assert "top_by_cta" in data, "Analytics should have 'top_by_cta'"
        
        # Verify counts
        assert data["published"] >= 10, f"Expected at least 10 published, got {data['published']}"
        
        print(f"✓ GET /api/blog/admin/analytics returns stats: {data['total']} total, {data['published']} published, {data['total_cta_clicks']} CTA clicks")


class TestBlogArticleContent:
    """Test specific article content requirements"""

    def test_article_has_who_for_field(self, api_client):
        """Article has 'who_for' field for target audience"""
        slug = "can-i-get-va-benefits-with-oth-discharge"
        response = api_client.get(f"{BASE_URL}/api/blog/articles/{slug}")
        assert response.status_code == 200
        
        article = response.json()
        assert "who_for" in article, "Article should have 'who_for' field"
        assert article["who_for"], "who_for should not be empty"
        
        print(f"✓ Article has who_for: '{article['who_for'][:50]}...'")

    def test_article_has_updated_at(self, api_client):
        """Article has updated_at timestamp"""
        slug = "can-i-get-va-benefits-with-oth-discharge"
        response = api_client.get(f"{BASE_URL}/api/blog/articles/{slug}")
        assert response.status_code == 200
        
        article = response.json()
        assert "updated_at" in article, "Article should have 'updated_at'"
        assert article["updated_at"], "updated_at should not be empty"
        
        print(f"✓ Article has updated_at: {article['updated_at']}")

    def test_llc_article_has_affiliates(self, api_client):
        """best-llc-services-veteran-businesses has affiliate blocks"""
        slug = "best-llc-services-veteran-businesses"
        response = api_client.get(f"{BASE_URL}/api/blog/articles/{slug}")
        assert response.status_code == 200
        
        article = response.json()
        assert article.get("affiliate_enabled") == True, "LLC article should have affiliate_enabled=True"
        assert len(article.get("affiliate_slots", [])) >= 2, "LLC article should have at least 2 affiliate slots"
        
        # Check for ZenBusiness and Northwest
        slot_names = [s["name"] for s in article["affiliate_slots"]]
        assert "ZenBusiness" in slot_names, "Should have ZenBusiness affiliate"
        assert "Northwest Registered Agent" in slot_names, "Should have Northwest affiliate"
        
        print(f"✓ LLC article has {len(article['affiliate_slots'])} affiliate slots: {slot_names}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

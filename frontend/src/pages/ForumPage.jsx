import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Shield, Briefcase, Rocket, Heart, Star, Search, Plus, ArrowUp, ArrowLeft, Send, Trash2, Pin } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ICONS = { MessageSquare, Shield, Briefcase, Rocket, Heart, Star };
const CAT_COLORS = {
  general: 'text-gray-600 bg-gray-50',
  benefits: 'text-blue-600 bg-blue-50',
  careers: 'text-green-600 bg-green-50',
  business: 'text-purple-600 bg-purple-50',
  wellness: 'text-rose-600 bg-rose-50',
  stories: 'text-amber-600 bg-amber-50',
};

export default function ForumPage() {
  const { user } = useAuth();
  const [view, setView] = useState('categories'); // categories | list | thread
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activePost, setActivePost] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '', category: 'general' });
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/forum/categories`, { withCredentials: true })
      .then(r => setCategories(r.data.categories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchPosts = useCallback(async (cat) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (cat && cat !== 'all') params.append('category', cat);
      if (search) params.append('search', search);
      const { data } = await axios.get(`${API}/api/forum/posts?${params}`, { withCredentials: true });
      setPosts(data.posts);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [sort, search]);

  const openCategory = (catId) => {
    setActiveCategory(catId);
    setView('list');
    fetchPosts(catId);
  };

  const openThread = async (postId) => {
    try {
      const { data } = await axios.get(`${API}/api/forum/posts/${postId}`, { withCredentials: true });
      setActivePost(data);
      setView('thread');
    } catch {
      toast.error('Failed to load post');
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await axios.post(`${API}/api/forum/posts`, {
        ...postForm,
        category: activeCategory || postForm.category
      }, { withCredentials: true });
      toast.success('Post created!');
      setNewPostOpen(false);
      setPostForm({ title: '', content: '', category: 'general' });
      fetchPosts(activeCategory);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setPosting(false);
  };

  const createReply = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const { data } = await axios.post(`${API}/api/forum/posts/${activePost.id}/reply`, { content: replyText }, { withCredentials: true });
      setActivePost(prev => ({ ...prev, replies: [...(prev.replies || []), data], reply_count: (prev.reply_count || 0) + 1 }));
      setReplyText('');
      toast.success('Reply posted!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setPosting(false);
  };

  const upvotePost = async (postId) => {
    try {
      const { data } = await axios.post(`${API}/api/forum/posts/${postId}/upvote`, {}, { withCredentials: true });
      if (view === 'thread' && activePost?.id === postId) {
        setActivePost(prev => ({ ...prev, upvotes: data.upvotes, upvoted_by: data.upvoted ? [...(prev.upvoted_by || []), user?.id] : (prev.upvoted_by || []).filter(id => id !== user?.id) }));
      }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: data.upvotes } : p));
    } catch {}
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/api/forum/posts/${postId}`, { withCredentials: true });
      toast.success('Post deleted');
      if (view === 'thread') { setView('list'); fetchPosts(activeCategory); }
      else fetchPosts(activeCategory);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const goBack = () => {
    if (view === 'thread') { setView('list'); fetchPosts(activeCategory); }
    else if (view === 'list') { setView('categories'); setActiveCategory(null); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="forum-page">
        <PageSEO path="/forum" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'categories' && (
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={goBack} data-testid="forum-back-btn">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="forum-heading">
                {view === 'categories' ? 'The Circle' : view === 'thread' ? activePost?.title : categories.find(c => c.id === activeCategory)?.name || 'All Posts'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {view === 'categories' ? 'Connect with fellow veterans. Ask, share, and support.' : `${total} posts`}
              </p>
            </div>
          </div>
          {view === 'list' && (
            <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90" data-testid="new-post-btn">
                  <Plus className="w-4 h-4 mr-1" /> New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-2xl">
                <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
                <form onSubmit={createPost} className="space-y-4" data-testid="post-form">
                  <div><Label>Title</Label><Input value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required minLength={3} className="rounded-lg" data-testid="post-title-input" /></div>
                  <div><Label>Content</Label><Textarea value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required minLength={10} rows={5} className="rounded-lg" data-testid="post-content-input" /></div>
                  {!activeCategory && (
                    <div>
                      <Label>Category</Label>
                      <Select value={postForm.category} onValueChange={v => setPostForm({...postForm, category: v})}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={posting} data-testid="submit-post-btn">
                    {posting ? 'Posting...' : 'Post'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Categories View */}
        {view === 'categories' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* All Posts card */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border rounded-2xl cursor-pointer hover:shadow-md hover:border-secondary/40 transition-all" onClick={() => openCategory('all')} data-testid="forum-cat-all">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">All Posts</h3>
                      <p className="text-xs text-muted-foreground">Browse all discussions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            {categories.map((cat, i) => {
              const Icon = ICONS[cat.icon] || MessageSquare;
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.05 }}>
                  <Card className="border rounded-2xl cursor-pointer hover:shadow-md hover:border-secondary/40 transition-all" onClick={() => openCategory(cat.id)} data-testid={`forum-cat-${cat.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CAT_COLORS[cat.id] || 'bg-gray-50'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-foreground">{cat.name}</h3>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{cat.post_count}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Posts List View */}
        {view === 'list' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search posts..." value={search} onChange={e => { setSearch(e.target.value); fetchPosts(activeCategory); }} className="pl-10 h-9 rounded-xl" data-testid="forum-search" />
              </div>
              <Select value={sort} onValueChange={v => { setSort(v); }}>
                <SelectTrigger className="h-9 w-32 rounded-xl" data-testid="forum-sort"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Most Upvoted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}</div>
            ) : posts.length === 0 ? (
              <Card className="rounded-xl border"><CardContent className="p-10 text-center text-muted-foreground">No posts yet. Be the first to start a conversation!</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {posts.map((post, i) => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="border rounded-xl hover:shadow-sm hover:border-secondary/30 transition-all cursor-pointer" onClick={() => openThread(post.id)} data-testid={`post-${post.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <button className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5" onClick={e => { e.stopPropagation(); upvotePost(post.id); }} data-testid={`upvote-${post.id}`}>
                            <ArrowUp className={`w-4 h-4 ${(post.upvoted_by || []).includes(user?.id) ? 'text-secondary' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-bold text-foreground">{post.upvotes || 0}</span>
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {post.pinned && <Pin className="w-3 h-3 text-secondary" />}
                              <h3 className="text-sm font-bold text-foreground">{post.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{post.content}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                              <span>{post.author_name}</span>
                              <Badge variant="outline" className="text-[10px] rounded-full py-0">{post.category}</Badge>
                              <span>{post.reply_count || 0} replies</span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Thread View */}
        {view === 'thread' && activePost && (
          <div className="space-y-4">
            <Card className="border rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <button className="flex flex-col items-center gap-0.5 shrink-0" onClick={() => upvotePost(activePost.id)} data-testid="thread-upvote">
                    <ArrowUp className={`w-5 h-5 ${(activePost.upvoted_by || []).includes(user?.id) ? 'text-secondary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-bold">{activePost.upvotes || 0}</span>
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs rounded-full">{activePost.category}</Badge>
                      {activePost.pinned && <Badge className="text-xs rounded-full bg-secondary/10 text-secondary border-0"><Pin className="w-3 h-3 mr-0.5" />Pinned</Badge>}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{activePost.content}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{activePost.author_name}</span> &middot; {new Date(activePost.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-1.5">
                        {(user?.role === 'admin' || user?.role === 'content_manager') && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={async () => {
                            try {
                              const { data } = await axios.post(`${API}/api/forum/posts/${activePost.id}/pin`, {}, { withCredentials: true });
                              setActivePost(prev => ({ ...prev, pinned: data.pinned }));
                              toast.success(data.pinned ? 'Post pinned' : 'Post unpinned');
                            } catch { toast.error('Failed'); }
                          }} data-testid="pin-post-btn"><Pin className="w-3 h-3 mr-1" /> {activePost.pinned ? 'Unpin' : 'Pin'}</Button>
                        )}
                        {(activePost.author_id === user?.id || user?.role === 'admin') && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500" onClick={() => deletePost(activePost.id)} data-testid="delete-post-btn"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Replies */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">{activePost.reply_count || 0} Replies</h3>
              <div className="space-y-2">
                {(activePost.replies || []).map((reply, i) => (
                  <motion.div key={reply.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="border rounded-xl" data-testid={`reply-${reply.id}`}>
                      <CardContent className="p-3">
                        <p className="text-sm text-foreground">{reply.content}</p>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          <span className="font-medium text-foreground">{reply.author_name}</span> &middot; {new Date(reply.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Reply Input */}
            <Card className="border rounded-xl">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    className="flex-1 rounded-lg text-sm"
                    data-testid="reply-input"
                  />
                  <Button className="rounded-lg bg-secondary hover:bg-secondary/90 self-end" onClick={createReply} disabled={posting || !replyText.trim()} data-testid="send-reply-btn">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

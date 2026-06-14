import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Shield, Ban, Trash2, RotateCcw, LayoutDashboard, UserCog, FileCheck, Flag } from 'lucide-react';
import { toast } from 'sonner';
import RoleLayout from '@/components/RoleLayout';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const adminNav = [
  { name: 'Command Center', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: UserCog },
  { name: 'Resources', href: '/admin/resources', icon: FileCheck },
  { name: 'Reports', href: '/admin/reports', icon: Flag },
];

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  moderator: 'bg-orange-100 text-orange-700',
  provider: 'bg-blue-100 text-blue-700',
  developer: 'bg-purple-100 text-purple-700',
  customer: 'bg-green-100 text-green-700',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (roleFilter !== 'all') params.append('role', roleFilter);
      const { data } = await axios.get(`${API}/api/admin/users?${params}`, { withCredentials: true });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch { }
    setLoading(false);
  }, [page, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/api/admin/users/${userId}/role`, { role: newRole }, { withCredentials: true });
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update role');
    }
  };

  const toggleSuspend = async (userId, suspended) => {
    try {
      await axios.put(`${API}/api/admin/users/${userId}/suspend`,
        { suspended: !suspended, reason: suspended ? null : 'Admin action' },
        { withCredentials: true }
      );
      toast.success(suspended ? 'User unsuspended' : 'User suspended');
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user and all their data?')) return;
    try {
      await axios.delete(`${API}/api/superadmin/users/${userId}`, { withCredentials: true });
      toast.success('User deleted');
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const resetPassword = async (userId) => {
    const newPass = window.prompt('Enter new password (min 6 chars):');
    if (!newPass || newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      await axios.post(`${API}/api/superadmin/users/${userId}/reset-password`, { new_password: newPass }, { withCredentials: true });
      toast.success('Password reset');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const filtered = search
    ? users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <RoleLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <div className="space-y-5" data-testid="admin-users-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total users</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg" data-testid="users-search" />
          </div>
          <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 rounded-lg" data-testid="users-role-filter">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="provider">Provider</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={4} className="p-3"><div className="h-8 bg-muted/50 rounded animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="border-b hover:bg-muted/20 transition-colors" data-testid={`user-row-${u.id}`}>
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-foreground">{u.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs rounded-full border-0 ${ROLE_COLORS[u.role] || ROLE_COLORS.customer}`}>{u.role || 'customer'}</Badge>
                        {u.suspended && <Badge variant="destructive" className="text-xs rounded-full">Suspended</Badge>}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Select onValueChange={v => changeRole(u.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs rounded-md" data-testid={`role-select-${u.id}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            <span>Role</span>
                          </SelectTrigger>
                          <SelectContent>
                            {['admin', 'moderator', 'provider', 'developer', 'customer'].map(r => (
                              <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleSuspend(u.id, u.suspended)} data-testid={`suspend-btn-${u.id}`}>
                          <Ban className="w-3 h-3 mr-1" />
                          {u.suspended ? 'Unsuspend' : 'Suspend'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => resetPassword(u.id)} data-testid={`reset-pwd-${u.id}`}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset Pwd
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500" onClick={() => deleteUser(u.id)} data-testid={`delete-user-${u.id}`}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="h-7"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </RoleLayout>
  );
}

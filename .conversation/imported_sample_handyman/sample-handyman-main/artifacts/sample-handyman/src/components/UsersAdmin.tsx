/**
 * Super Admin console — add, edit, and remove Admins & Members.
 */
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
  type AdminUser,
} from '@/lib/admin-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, UserPlus, Trash2, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'Member',
};

const statusStyles: Record<string, string> = {
  active: 'bg-primary text-primary-foreground',
  invited: 'bg-accent text-accent-foreground',
  disabled: 'bg-muted text-muted-foreground',
};

export function UsersAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError } = useListUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editStatus, setEditStatus] = useState<'invited' | 'active' | 'disabled'>(
    'active',
  );
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  const users = data?.users ?? [];

  const onAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        data: {
          email: email.trim(),
          role,
          name: name.trim() || undefined,
        },
      });
      setEmail('');
      setName('');
      setRole('member');
      toast({ title: 'User added' });
      await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  const onSaveEdit = async () => {
    if (!editing || editing.isSystem) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        data: { role: editRole, status: editStatus },
      });
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const onConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete user');
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-3xl tracking-tight flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" />
          Super Admin Console
        </h2>
        <p className="text-muted-foreground mt-2">
          Add Admins and Members so they can sign in with Google. The system Super
          Admin is protected and cannot be edited or removed.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add user
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAddUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="add-user-gmail">Gmail</Label>
              <Input
                id="add-user-gmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-name">Name (optional)</Label>
              <Input
                id="add-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'admin' | 'member')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="font-display font-bold"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Add user'
                )}
              </Button>
            </div>
          </form>
          {formError ? (
            <p className="text-sm text-destructive mt-3" role="alert">
              {formError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <p className="text-destructive">Failed to load users.</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No users yet. Add a Gmail above so they can sign in.
          </p>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="border-border/60">
              <CardContent className="py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-display font-bold text-lg truncate">
                      {user.name || user.email}
                    </p>
                    <Badge className={cn(statusStyles[user.status] ?? '')}>
                      {user.status}
                    </Badge>
                    <Badge variant="outline">{roleLabel[user.role] ?? user.role}</Badge>
                    {user.isSystem ? (
                      <Badge variant="secondary">Protected</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    <span className="sr-only">Gmail: </span>
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.lastLoginAt
                      ? `Last login ${formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}`
                      : 'Never signed in'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-display font-bold"
                    disabled={user.isSystem}
                    onClick={() => {
                      setEditing(user);
                      setEditRole(
                        user.role === 'admin' || user.role === 'member'
                          ? user.role
                          : 'member',
                      );
                      setEditStatus(
                        user.status === 'invited' ||
                          user.status === 'active' ||
                          user.status === 'disabled'
                          ? user.status
                          : 'active',
                      );
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="font-display font-bold text-destructive hover:text-destructive"
                    disabled={user.isSystem}
                    onClick={() => setPendingDelete(user)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Edit {editing?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as 'admin' | 'member')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) =>
                  setEditStatus(v as 'invited' | 'active' | 'disabled')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="font-display font-bold"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="font-display font-bold"
              disabled={updateMutation.isPending}
              onClick={onSaveEdit}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete user?"
        description={
          pendingDelete
            ? `Remove ${pendingDelete.email} from admin access. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}

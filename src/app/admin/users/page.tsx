"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface User {
    id: string;
    username: string;
    email?: string;
    role: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}

export default function UsersPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        username: "",
        password: "",
        email: "",
        role: "member",
    });

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState({
        username: "",
        password: "",
        email: "",
        role: "member",
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && (session?.user as any)?.role !== "super_admin") {
            router.push("/");
        }
    }, [status, session, router]);

    useEffect(() => {
        if ((session?.user as any)?.role === "super_admin") {
            fetchUsers();
        }
    }, [session]);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });

            if (res.ok) {
                toast.success("User created successfully");
                setShowCreateModal(false);
                setNewUser({ username: "", password: "", email: "", role: "member" });
                fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to create user");
            }
        } catch (error) {
            console.error("Error creating user:", error);
            toast.error("Failed to create user");
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditData({
            username: user.username,
            email: user.email || "",
            role: user.role,
            password: "", // Reset password field
        });
        setShowEditModal(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: editData.username,
                    email: editData.email,
                    role: editData.role,
                    ...(editData.password ? { password: editData.password } : {}),
                }),
            });

            if (res.ok) {
                toast.success("User updated successfully");
                setShowEditModal(false);
                fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update user");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("User deleted successfully");
                fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (res.ok) {
                toast.success(`User ${!currentStatus ? "activated" : "deactivated"}`);
                fetchUsers();
            } else {
                toast.error("Failed to update user status");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user status");
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if ((session?.user as any)?.role !== "super_admin") {
        return null;
    }

    return (
        <AdminLayout>
            <div className="max-w-6xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">User Management</h1>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus size={20} />
                        Create User
                    </button>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
                    <table className="w-full">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="text-left p-4 text-slate-400 font-medium">Username</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Email</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Role</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Last Login</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                    <td className="p-4 text-white font-medium">{user.username}</td>
                                    <td className="p-4 text-slate-400">{user.email || "-"}</td>
                                    <td className="p-4">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${user.role === "super_admin"
                                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                    : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                                }`}
                                        >
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${user.isActive
                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                                                    : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                                }`}
                                        >
                                            {user.isActive ? <Check size={14} /> : <X size={14} />}
                                            {user.isActive ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {user.lastLogin
                                            ? new Date(user.lastLogin).toLocaleDateString()
                                            : "Never"}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                                                title="Edit user"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Delete user"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Create User Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h2 className="text-2xl font-bold text-white mb-6">Create New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        placeholder="e.g. kabeerc"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Password</label>
                                    <input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Role</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all font-medium"
                                    >
                                        Create User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h2 className="text-2xl font-bold text-white mb-6">Edit User</h2>
                            <form onSubmit={handleUpdateUser} className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Username (ID)</label>
                                    <input
                                        type="text"
                                        value={editData.username}
                                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">New Password (leave blank to keep current)</label>
                                    <input
                                        type="password"
                                        value={editData.password}
                                        onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2">Role</label>
                                    <select
                                        value={editData.role}
                                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-cyan-500/20"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService, User } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'patient' | 'doctor' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadUsers();
  }, [currentPage, roleFilter, statusFilter, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit,
      };

      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await apiService.getUsers(params);
      if (response.success) {
        let filteredUsers = response.data.users;

        // Filter by status on frontend (since backend doesn't have status filter)
        if (statusFilter !== 'all') {
          filteredUsers = filteredUsers.filter((user) =>
            statusFilter === 'active' ? user.isActive : !user.isActive
          );
        }

        setUsers(filteredUsers);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleRoleFilter = (role: 'patient' | 'doctor' | 'all') => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pageName="მომხმარებლები" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              მომხმარებლების მართვა
            </h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="ძიება სახელით, ელ. ფოსტით ან ტელეფონით..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              {/* Role Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  როლი
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => handleRoleFilter(e.target.value as 'patient' | 'doctor' | 'all')}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                >
                  <option value="all">ყველა</option>
                  <option value="patient">პაციენტი</option>
                  <option value="doctor">ექიმი</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  სტატუსი
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                >
                  <option value="all">ყველა</option>
                  <option value="active">აქტიური</option>
                  <option value="inactive">არააქტიური</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    სახელი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    ელ. ფოსტა
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    როლი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    სტატუსი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    შექმნის თარიღი
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-dark-4">
                      მომხმარებლები არ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-3"
                    >
                      <td className="p-4 text-dark dark:text-white">
                        {user.name}
                      </td>
                      <td className="p-4 text-dark-4 dark:text-dark-6">
                        {user.email}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            user.role === 'doctor'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-success/10 text-success'
                          }`}
                        >
                          {user.role === 'doctor' ? 'ექიმი' : 'პაციენტი'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            user.isActive
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {user.isActive ? 'აქტიური' : 'არააქტიური'}
                        </span>
                      </td>
                      <td className="p-4 text-dark-4 dark:text-dark-6">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('ka-GE')
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-dark-4 dark:text-dark-6">
                ნაჩვენებია {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, total)} {total}-დან
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  წინა
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'border border-stroke text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3'
                        } disabled:opacity-50`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  შემდეგი
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


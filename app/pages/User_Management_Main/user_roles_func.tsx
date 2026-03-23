'use client';

// ─────────────────────────────────────────────
//  user_roles_func.tsx  –  Role Permissions: Types, Data & Hook
//  UI components live in role_permissions_popup.tsx
// ─────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { UserRole } from './user_functions';

// ── Types ──────────────────────────────────────────────────────────────────

export type PermissionKey =
  // System Admin – Dashboard
  | 'sa_view_admin_dashboard'
  | 'sa_view_license_expiry'
  | 'sa_add_company'
  | 'sa_add_industry'
  // System Admin – Client Overview
  | 'sa_view_overview'
  | 'sa_view_users'
  | 'sa_view_tickets'
  | 'sa_view_msa_expiry'
  | 'sa_edit_general_info'
  | 'sa_add_edit_branches'
  | 'sa_view_branch_info'
  | 'sa_add_edit_pos'
  | 'sa_add_edit_peripherals'
  | 'sa_update_msa_details'
  // System Admin – Analytics
  | 'sa_view_analytics_dashboard'
  | 'sa_view_analytics_overview'
  | 'sa_export_analytics'
  | 'sa_import_analytics'
  // Manager – Dashboard
  | 'mgr_view_branch_info'
  | 'mgr_view_pos_info'
  | 'mgr_view_users'
  | 'mgr_add_edit_users'
  // Manager – Learning Center
  | 'mgr_access_learning_center'
  | 'mgr_create_learning_materials'
  | 'mgr_add_edit_lc_users'
  // User – Dashboard
  | 'usr_view_learning_dashboard'
  | 'usr_access_lc_modules';

export interface Permission {
  key:         PermissionKey;
  label:       string;
  description: string;
  group:       string;
  groupIcon:   string;
  dangerous?:  boolean;
  roles:       UserRole[];
}

// ── Permission Definitions ──────────────────────────────────────────────────

export const ALL_PERMISSIONS: Permission[] = [

  // ── System Admin – Dashboard ──────────────────────────────────────────────
  {
    key: 'sa_view_admin_dashboard', label: 'View Admin Dashboard',
    description: 'Access the main admin dashboard overview',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['System Admin'],
  },
  {
    key: 'sa_view_license_expiry', label: 'View License Expiry',
    description: 'View license expiry dates and alerts',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['System Admin'],
  },
  {
    key: 'sa_add_company', label: 'Add Company',
    description: 'Register and onboard new companies into the system',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['System Admin'],
  },
  {
    key: 'sa_add_industry', label: 'Add Industry',
    description: 'Create and manage industry categories',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['System Admin'],
  },

  // ── System Admin – Client Overview ───────────────────────────────────────
  {
    key: 'sa_view_overview', label: 'View Overview',
    description: 'Access the client overview summary page',
    group: 'Client Overview', groupIcon: '🏢',
    roles: ['System Admin'],
  },
  {
    key: 'sa_view_users', label: 'View Users',
    description: 'Browse client user accounts and profiles',
    group: 'Client Overview', groupIcon: '🏢',
    roles: ['System Admin'],
  },
  {
    key: 'sa_view_tickets', label: 'View Tickets',
    description: 'View support and service tickets',
    group: 'Client Overview', groupIcon: '🏢',
    roles: ['System Admin'],
  },
  {
    key: 'sa_view_msa_expiry', label: 'View MSA Expiry',
    description: 'View master service agreement expiry details',
    group: 'Client Overview', groupIcon: '🏢',
    roles: ['System Admin'],
  },
  {
    key: 'sa_edit_general_info', label: 'Edit General Information',
    description: 'Modify core client general information',
    group: 'Client Overview', groupIcon: '🏢',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_add_edit_branches', label: 'Add & Edit Branches',
    description: 'Create and update client branch records',
    group: 'Client Overview', groupIcon: '🏢',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_view_branch_info', label: 'View Branch Information',
    description: 'Access detailed branch information and data',
    group: 'Client Overview', groupIcon: '🏢',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_add_edit_pos', label: 'Add & Edit POS',
    description: 'Configure and manage point-of-sale systems',
    group: 'Client Overview', groupIcon: '🏢',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_add_edit_peripherals', label: 'Add & Edit Peripherals & Accessories',
    description: 'Manage peripherals and accessory configurations',
    group: 'Client Overview', groupIcon: '🏢',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_update_msa_details', label: 'Update MSA Details',
    description: 'Modify master service agreement information',
    group: 'Client Overview', groupIcon: '🏢',
    dangerous: true,
    roles: ['System Admin'],
  },

  // ── System Admin – Analytics ──────────────────────────────────────────────
  {
    key: 'sa_view_analytics_dashboard', label: 'View Analytics Dashboard',
    description: 'Access the full analytics dashboard',
    group: 'Analytics', groupIcon: '📈',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_view_analytics_overview', label: 'View Analytics Overview',
    description: 'Browse analytics summary and overview pages',
    group: 'Analytics', groupIcon: '📈',
    roles: ['System Admin'],
  },
  {
    key: 'sa_export_analytics', label: 'Export Analytics',
    description: 'Download and export analytics data reports',
    group: 'Analytics', groupIcon: '📈',
    dangerous: true,
    roles: ['System Admin'],
  },
  {
    key: 'sa_import_analytics', label: 'Import Analytics',
    description: 'Upload and import analytics data into the system',
    group: 'Analytics', groupIcon: '📈',
    dangerous: true,
    roles: ['System Admin'],
  },

  // ── Manager – Dashboard ───────────────────────────────────────────────────
  {
    key: 'mgr_view_branch_info', label: 'View Branch Information',
    description: 'Access branch details and location data',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['Manager'],
  },
  {
    key: 'mgr_view_pos_info', label: 'View POS Information',
    description: 'View point-of-sale terminal details',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['Manager'],
  },
  {
    key: 'mgr_view_users', label: 'View Users',
    description: 'Browse user accounts within this manager\'s scope',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['Manager'],
  },
  {
    key: 'mgr_add_edit_users', label: 'Add & Edit Users',
    description: 'Create and modify user accounts',
    group: 'Dashboard', groupIcon: '📊',
    dangerous: true,
    roles: ['Manager'],
  },

  // ── Manager – Learning Center ─────────────────────────────────────────────
  {
    key: 'mgr_access_learning_center', label: 'Access to Learning Center',
    description: 'Enter and administer the Learning Center module',
    group: 'Learning Center', groupIcon: '🎓',
    dangerous: true,
    roles: ['Manager'],
  },
  {
    key: 'mgr_create_learning_materials', label: 'Create Learning Materials',
    description: 'Author and publish new learning content and courses',
    group: 'Learning Center', groupIcon: '🎓',
    roles: ['Manager'],
  },
  {
    key: 'mgr_add_edit_lc_users', label: 'Add & Edit Learning Center Users',
    description: 'Manage users enrolled in the Learning Center',
    group: 'Learning Center', groupIcon: '🎓',
    roles: ['Manager'],
  },

  // ── User – Dashboard ──────────────────────────────────────────────────────
  {
    key: 'usr_view_learning_dashboard', label: 'View Learning Dashboard',
    description: 'Access the personal learning progress dashboard',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['User'],
  },
  {
    key: 'usr_access_lc_modules', label: 'Access Learning Center Modules',
    description: 'View and complete Learning Center course modules',
    group: 'Dashboard', groupIcon: '📊',
    roles: ['User'],
  },
];

// ── Helper: get only the permissions relevant to a given role ──────────────

export function getPermissionsForRole(role: UserRole): Permission[] {
  if (role === 'Super Admin') return ALL_PERMISSIONS;
  return ALL_PERMISSIONS.filter(p => p.roles.includes(role));
}

// ── Default permissions per role ────────────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  'Super Admin': Object.fromEntries(
    ALL_PERMISSIONS.map(p => [p.key, true])
  ) as Record<PermissionKey, boolean>,

  'System Admin': Object.fromEntries(
    ALL_PERMISSIONS.map(p => [p.key, p.roles.includes('System Admin')])
  ) as Record<PermissionKey, boolean>,

  'Manager': Object.fromEntries(
    ALL_PERMISSIONS.map(p => [p.key, p.roles.includes('Manager')])
  ) as Record<PermissionKey, boolean>,

  'User': Object.fromEntries(
    ALL_PERMISSIONS.map(p => [p.key, p.roles.includes('User')])
  ) as Record<PermissionKey, boolean>,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseRolePermissionsReturn {
  openRole:  UserRole | null;
  rolePerms: Record<UserRole, Record<PermissionKey, boolean>>;
  openModal: (role: UserRole) => void;
  closeModal: () => void;
  savePerms: (role: UserRole, perms: Record<PermissionKey, boolean>) => void;
}

export function useRolePermissions(): UseRolePermissionsReturn {
  const [openRole, setOpenRole] = useState<UserRole | null>(null);
  const [rolePerms, setRolePerms] = useState<Record<UserRole, Record<PermissionKey, boolean>>>({
    'Super Admin':  { ...DEFAULT_ROLE_PERMISSIONS['Super Admin'] },
    'System Admin': { ...DEFAULT_ROLE_PERMISSIONS['System Admin'] },
    'Manager':      { ...DEFAULT_ROLE_PERMISSIONS['Manager'] },
    'User':         { ...DEFAULT_ROLE_PERMISSIONS['User'] },
  });

  const openModal  = useCallback((role: UserRole) => setOpenRole(role), []);
  const closeModal = useCallback(() => setOpenRole(null), []);
  const savePerms  = useCallback((role: UserRole, perms: Record<PermissionKey, boolean>) => {
    setRolePerms(prev => ({ ...prev, [role]: { ...perms } }));
  }, []);

  return { openRole, rolePerms, openModal, closeModal, savePerms };
}
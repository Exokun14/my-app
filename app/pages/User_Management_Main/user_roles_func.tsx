'use client';

// ─────────────────────────────────────────────
//  user_roles_func.tsx  –  Role Permissions: Types, Data & Hook
//  UI components live in role_permissions_popup.tsx
// ─────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { UserRole } from './user_functions';

// ── Types ──────────────────────────────────────────────────────────────────

export type PermissionKey =
  | 'view_dashboard'    | 'view_analytics'       | 'export_reports'
  | 'view_users'        | 'add_users'             | 'edit_users'         | 'delete_users' | 'manage_roles'
  | 'view_clients'      | 'add_clients'           | 'edit_clients'       | 'delete_clients'
  | 'view_retail'       | 'manage_inventory'      | 'process_orders'     | 'view_transactions'
  | 'view_settings'     | 'edit_settings'         | 'manage_integrations'| 'view_audit_logs'
  | 'send_notifications'| 'manage_announcements';

export interface Permission {
  key:         PermissionKey;
  label:       string;
  description: string;
  group:       string;
  groupIcon:   string;
  dangerous?:  boolean;
}

// ── Permission Definitions ──────────────────────────────────────────────────

export const ALL_PERMISSIONS: Permission[] = [
  // Dashboard & Analytics
  { key: 'view_dashboard',        label: 'View Dashboard',        description: 'Access the main dashboard overview',         group: 'Dashboard & Analytics', groupIcon: '📊' },
  { key: 'view_analytics',        label: 'View Analytics',         description: 'View detailed reports and analytics data',   group: 'Dashboard & Analytics', groupIcon: '📊' },
  { key: 'export_reports',        label: 'Export Reports',         description: 'Download and export analytics reports',      group: 'Dashboard & Analytics', groupIcon: '📊' },
  // User Management
  { key: 'view_users',            label: 'View Users',             description: 'See the user list and profiles',             group: 'User Management',       groupIcon: '👥' },
  { key: 'add_users',             label: 'Add Users',              description: 'Create new user accounts',                  group: 'User Management',       groupIcon: '👥' },
  { key: 'edit_users',            label: 'Edit Users',             description: 'Modify existing user information',          group: 'User Management',       groupIcon: '👥' },
  { key: 'delete_users',          label: 'Delete Users',           description: 'Permanently remove user accounts',          group: 'User Management',       groupIcon: '👥', dangerous: true },
  { key: 'manage_roles',          label: 'Manage Roles',           description: 'Assign and modify user roles & permissions', group: 'User Management',       groupIcon: '👥', dangerous: true },
  // Client Management
  { key: 'view_clients',          label: 'View Clients',           description: 'Browse client profiles and records',        group: 'Client Management',     groupIcon: '🏢' },
  { key: 'add_clients',           label: 'Add Clients',            description: 'Register new client accounts',              group: 'Client Management',     groupIcon: '🏢' },
  { key: 'edit_clients',          label: 'Edit Clients',           description: 'Update client information and details',     group: 'Client Management',     groupIcon: '🏢' },
  { key: 'delete_clients',        label: 'Delete Clients',         description: 'Remove client records from the system',     group: 'Client Management',     groupIcon: '🏢', dangerous: true },
  // Retail / Operations
  { key: 'view_retail',           label: 'View Retail Panel',      description: 'Access the retail admin section',           group: 'Retail & Operations',   groupIcon: '🛍️' },
  { key: 'manage_inventory',      label: 'Manage Inventory',       description: 'Add, update, and remove inventory items',   group: 'Retail & Operations',   groupIcon: '🛍️' },
  { key: 'process_orders',        label: 'Process Orders',         description: 'Handle and fulfill customer orders',        group: 'Retail & Operations',   groupIcon: '🛍️' },
  { key: 'view_transactions',     label: 'View Transactions',      description: 'See transaction history and details',       group: 'Retail & Operations',   groupIcon: '🛍️' },
  // Settings & System
  { key: 'view_settings',         label: 'View Settings',          description: 'Browse system configuration pages',        group: 'Settings & System',     groupIcon: '⚙️' },
  { key: 'edit_settings',         label: 'Edit Settings',          description: 'Modify system-level configurations',       group: 'Settings & System',     groupIcon: '⚙️', dangerous: true },
  { key: 'manage_integrations',   label: 'Manage Integrations',    description: 'Connect and configure third-party tools',  group: 'Settings & System',     groupIcon: '⚙️', dangerous: true },
  { key: 'view_audit_logs',       label: 'View Audit Logs',        description: 'Read system event and change logs',        group: 'Settings & System',     groupIcon: '⚙️' },
  // Communication
  { key: 'send_notifications',    label: 'Send Notifications',     description: 'Push alerts and notifications to users',   group: 'Communication',         groupIcon: '🔔' },
  { key: 'manage_announcements',  label: 'Manage Announcements',   description: 'Post and manage system-wide announcements', group: 'Communication',        groupIcon: '🔔' },
];

// ── Default permissions per role ────────────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  'System Admin': {
    view_dashboard: true,  view_analytics: true,  export_reports: true,
    view_users: true,      add_users: true,        edit_users: true,      delete_users: true,  manage_roles: true,
    view_clients: true,    add_clients: true,      edit_clients: true,    delete_clients: true,
    view_retail: true,     manage_inventory: true, process_orders: true,  view_transactions: true,
    view_settings: true,   edit_settings: true,    manage_integrations: true, view_audit_logs: true,
    send_notifications: true, manage_announcements: true,
  },
  'Manager': {
    view_dashboard: true,  view_analytics: true,  export_reports: true,
    view_users: true,      add_users: false,       edit_users: true,      delete_users: false, manage_roles: false,
    view_clients: true,    add_clients: true,      edit_clients: true,    delete_clients: false,
    view_retail: true,     manage_inventory: true, process_orders: true,  view_transactions: true,
    view_settings: true,   edit_settings: false,   manage_integrations: false, view_audit_logs: true,
    send_notifications: true, manage_announcements: false,
  },
  'User': {
    view_dashboard: true,  view_analytics: false, export_reports: false,
    view_users: false,     add_users: false,       edit_users: false,     delete_users: false, manage_roles: false,
    view_clients: true,    add_clients: false,     edit_clients: false,   delete_clients: false,
    view_retail: true,     manage_inventory: false,process_orders: true,  view_transactions: false,
    view_settings: false,  edit_settings: false,   manage_integrations: false, view_audit_logs: false,
    send_notifications: false, manage_announcements: false,
  },
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
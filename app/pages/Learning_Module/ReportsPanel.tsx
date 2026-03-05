'use client'

import { useState } from "react";
import type { Course } from "../../Data/types";

interface ReportsPanelProps {
  courses: Course[];
  progressData: Array<{
    name: string;
    company: string;
    course: string;
    progress: number;
    started: string;
    completed: string | null;
    status: string;
  }>;
  clients: Array<{
    id: number;
    name: string;
    cat: string;
  }>;
}

export default function ReportsPanel({ courses, progressData, clients }: ReportsPanelProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("All Companies");
  const [selectedCourse, setSelectedCourse] = useState<string>("All Courses");

  // Get unique companies
  const companies = ["All Companies", ...Array.from(new Set(clients.map(c => c.name)))];
  
  // Get unique courses
  const courseNames = ["All Courses", ...Array.from(new Set(courses.map(c => c.title)))];

  // Filter data
  const filteredData = progressData.filter(p => {
    const companyMatch = selectedCompany === "All Companies" || p.company === selectedCompany;
    const courseMatch = selectedCourse === "All Courses" || p.course === selectedCourse;
    return companyMatch && courseMatch;
  });

  // Calculate stats
  const totalUsers = filteredData.length;
  const completedUsers = filteredData.filter(p => p.status === "Completed").length;
  const inProgressUsers = filteredData.filter(p => p.status === "In Progress").length;
  const avgProgress = totalUsers > 0 
    ? Math.round(filteredData.reduce((sum, p) => sum + p.progress, 0) / totalUsers)
    : 0;

  // Company stats
  const companyStats = companies
    .filter(c => c !== "All Companies")
    .map(company => {
      const companyData = progressData.filter(p => p.company === company);
      return {
        name: company,
        totalUsers: companyData.length,
        completed: companyData.filter(p => p.status === "Completed").length,
        avgProgress: companyData.length > 0
          ? Math.round(companyData.reduce((sum, p) => sum + p.progress, 0) / companyData.length)
          : 0
      };
    })
    .sort((a, b) => b.totalUsers - a.totalUsers);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ 
          fontSize: 24, 
          fontWeight: 900, 
          color: 'var(--t1,#18103a)', 
          letterSpacing: '-0.02em',
          marginBottom: 6
        }}>
          Reports & Analytics
        </h2>
        <p style={{ fontSize: 13, color: 'var(--t2,#4a3870)' }}>
          Track learner progress and performance across all courses and companies
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        padding: 16,
        background: 'var(--surface,#fff)',
        border: '1.5px solid var(--border,rgba(124,58,237,0.1))',
        borderRadius: 12
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ 
            display: 'block', 
            fontSize: 11, 
            fontWeight: 700, 
            color: 'var(--t3,#a89dc8)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6
          }}>
            Company
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border,rgba(124,58,237,0.15))',
              background: 'var(--bg,#faf9ff)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--t1,#18103a)',
              cursor: 'pointer'
            }}
          >
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ 
            display: 'block', 
            fontSize: 11, 
            fontWeight: 700, 
            color: 'var(--t3,#a89dc8)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6
          }}>
            Course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border,rgba(124,58,237,0.15))',
              background: 'var(--bg,#faf9ff)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--t1,#18103a)',
              cursor: 'pointer'
            }}
          >
            {courseNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          padding: 18,
          background: 'var(--surface,#fff)',
          border: '1.5px solid var(--border,rgba(124,58,237,0.1))',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--t1,#18103a)', marginBottom: 4 }}>
            {totalUsers}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Learners
          </div>
        </div>

        <div style={{
          padding: 18,
          background: 'var(--surface,#fff)',
          border: '1.5px solid rgba(13,148,136,0.2)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--teal,#0d9488)', marginBottom: 4 }}>
            {completedUsers}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Completed
          </div>
        </div>

        <div style={{
          padding: 18,
          background: 'var(--surface,#fff)',
          border: '1.5px solid rgba(217,119,6,0.2)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706', marginBottom: 4 }}>
            {inProgressUsers}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In Progress
          </div>
        </div>

        <div style={{
          padding: 18,
          background: 'var(--surface,#fff)',
          border: '1.5px solid rgba(124,58,237,0.2)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--purple,#7c3aed)', marginBottom: 4 }}>
            {avgProgress}%
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg Progress
          </div>
        </div>
      </div>

      {/* Company Performance */}
      <div style={{
        background: 'var(--surface,#fff)',
        border: '1.5px solid var(--border,rgba(124,58,237,0.1))',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24
      }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--t1,#18103a)',
          marginBottom: 16
        }}>
          Company Performance
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {companyStats.map(stat => (
            <div key={stat.name} style={{
              padding: 14,
              background: 'var(--bg,#faf9ff)',
              border: '1.5px solid var(--border,rgba(124,58,237,0.08))',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1,#18103a)', marginBottom: 4 }}>
                  {stat.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3,#a89dc8)' }}>
                  {stat.totalUsers} learner{stat.totalUsers !== 1 ? 's' : ''} • {stat.completed} completed
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 120,
                  height: 6,
                  background: 'rgba(124,58,237,0.1)',
                  borderRadius: 6,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${stat.avgProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488))',
                    borderRadius: 6,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1,#18103a)', minWidth: 45 }}>
                  {stat.avgProgress}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learner List */}
      <div style={{
        background: 'var(--surface,#fff)',
        border: '1.5px solid var(--border,rgba(124,58,237,0.1))',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border,rgba(124,58,237,0.08))' }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--t1,#18103a)'
          }}>
            Learner Details
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg,#faf9ff)', borderBottom: '1px solid var(--border,rgba(124,58,237,0.08))' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t3,#a89dc8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((learner, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border,rgba(124,58,237,0.06))' }}>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--t1,#18103a)' }}>
                    {learner.name}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--t2,#4a3870)' }}>
                    {learner.company}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--t2,#4a3870)' }}>
                    {learner.course}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1,
                        height: 6,
                        background: 'rgba(124,58,237,0.1)',
                        borderRadius: 6,
                        overflow: 'hidden',
                        maxWidth: 100
                      }}>
                        <div style={{
                          width: `${learner.progress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488))',
                          borderRadius: 6
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1,#18103a)', minWidth: 35 }}>
                        {learner.progress}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: learner.status === 'Completed' ? 'rgba(13,148,136,0.08)' : 'rgba(217,119,6,0.08)',
                      color: learner.status === 'Completed' ? 'var(--teal,#0d9488)' : '#d97706',
                      border: learner.status === 'Completed' ? '1px solid rgba(13,148,136,0.2)' : '1px solid rgba(217,119,6,0.2)'
                    }}>
                      {learner.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

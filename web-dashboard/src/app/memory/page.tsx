'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface UserPreferences {
  languages: string[];
  frameworks: string[];
  acceptanceRate: number;
  editRate: number;
  totalGenerations: number;
}

interface Project {
  id: string;
  projectName: string;
  projectPath: string;
  lastAccessed: string;
  _count: {
    chatMessages: number;
    generations: number;
  };
}

export default function MemoryPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemoryData();
  }, []);

  const loadMemoryData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [profileRes, projectsRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/memory/profile', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/v1/memory/projects', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const profileData = await profileRes.json();
      const projectsData = await projectsRes.json();

      setPreferences(profileData.preferences);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-white">Memory & Learning</h1>
        <p className="text-gray-400">Loading memory data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-white">Memory & Learning</h1>

      {/* User Preferences Card */}
      <Card className="bg-gray-800 border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Your Coding Style</h2>
        
        {preferences ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Preferred Languages</p>
              <div className="flex flex-wrap gap-2">
                {preferences.languages.length > 0 ? (
                  preferences.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                    >
                      {lang}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">None yet</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Preferred Frameworks</p>
              <div className="flex flex-wrap gap-2">
                {preferences.frameworks.length > 0 ? (
                  preferences.frameworks.map((framework) => (
                    <span
                      key={framework}
                      className="px-3 py-1 bg-green-600 text-white rounded-full text-sm"
                    >
                      {framework}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">None yet</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Acceptance Rate</p>
              <p className="text-2xl font-bold text-white">
                {(preferences.acceptanceRate * 100).toFixed(0)}%
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${preferences.acceptanceRate * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Edit Rate</p>
              <p className="text-2xl font-bold text-white">
                {(preferences.editRate * 100).toFixed(0)}%
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${preferences.editRate * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Total Generations</p>
              <p className="text-2xl font-bold text-white">
                {preferences.totalGenerations}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {preferences.totalGenerations < 5
                  ? `${5 - preferences.totalGenerations} more to unlock insights`
                  : 'Insights unlocked!'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">No preferences learned yet. Generate some code to get started!</p>
        )}
      </Card>

      {/* Projects Card */}
      <Card className="bg-gray-800 border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Your Projects</h2>
        
        {projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {project.projectName}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{project.projectPath}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Last accessed:{' '}
                      {new Date(project.lastAccessed).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <span className="text-sm text-gray-300">
                      {project._count.chatMessages} messages
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                    <span className="text-sm text-gray-300">
                      {project._count.generations} generations
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">
            No projects yet. Start coding in a project folder to create your first project memory!
          </p>
        )}
      </Card>
    </div>
  );
}

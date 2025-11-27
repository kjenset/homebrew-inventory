import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/entities/AppSettings';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Hop } from 'lucide-react';

const themes = {
    amber: {
        '--background-from': '#fef3c7', /* amber-100 */
        '--background-to': '#fde68a',   /* amber-200 */
        '--primary-text': '#78350f',    /* amber-900 */
        '--secondary-text': '#92400e',  /* amber-700 */
        '--accent-text': '#a16207',     /* amber-600 */
        '--button-bg': '#f59e0b',       /* amber-500 */
        '--button-bg-hover': '#d97706', /* amber-600 */
        '--border-color': '#fde68a',   /* amber-200 */
        '--border-focus-color': '#fbbf24', /* amber-400 */
        '--outline-hover-bg': '#fffbeb', /* amber-50 */
    },
    blue: {
        '--background-from': '#dbeafe', /* blue-100 */
        '--background-to': '#bfdbfe',   /* blue-200 */
        '--primary-text': '#1e3a8a',    /* blue-900 */
        '--secondary-text': '#1d4ed8',  /* blue-700 */
        '--accent-text': '#2563eb',     /* blue-600 */
        '--button-bg': '#3b82f6',       /* blue-500 */
        '--button-bg-hover': '#2563eb', /* blue-600 */
        '--border-color': '#bfdbfe',   /* blue-200 */
        '--border-focus-color': '#60a5fa', /* blue-400 */
        '--outline-hover-bg': '#eff6ff', /* blue-50 */
    },
    green: {
        '--background-from': '#d1fae5', /* green-100 */
        '--background-to': '#a7f3d0',   /* green-200 */
        '--primary-text': '#064e3b',    /* green-900 */
        '--secondary-text': '#047857',  /* green-700 */
        '--accent-text': '#059669',     /* green-600 */
        '--button-bg': '#10b981',       /* green-500 */
        '--button-bg-hover': '#059669', /* green-600 */
        '--border-color': '#a7f3d0',   /* green-200 */
        '--border-focus-color': '#34d399', /* green-400 */
        '--outline-hover-bg': '#ecfdf5', /* green-50 */
    },
    purple: {
        '--background-from': '#e9d5ff', /* purple-100 */
        '--background-to': '#d8b4fe',   /* purple-200 */
        '--primary-text': '#4a044e',    /* purple-900 */
        '--secondary-text': '#6b21a8',  /* purple-700 */
        '--accent-text': '#7e22ce',     /* purple-600 */
        '--button-bg': '#a855f7',       /* purple-500 */
        '--button-bg-hover': '#9333ea', /* purple-600 */
        '--border-color': '#d8b4fe',   /* purple-200 */
        '--border-focus-color': '#c084fc', /* purple-400 */
        '--outline-hover-bg': '#f5f3ff', /* purple-50 */
    },
    gray: {
        '--background-from': '#f3f4f6', /* gray-100 */
        '--background-to': '#e5e7eb',   /* gray-200 */
        '--primary-text': '#1f2937',    /* gray-800 */
        '--secondary-text': '#374151',  /* gray-700 */
        '--accent-text': '#4b5563',     /* gray-600 */
        '--button-bg': '#6b7280',       /* gray-500 */
        '--button-bg-hover': '#4b5563', /* gray-600 */
        '--border-color': '#e5e7eb',   /* gray-200 */
        '--border-focus-color': '#9ca3af', /* gray-400 */
        '--outline-hover-bg': '#f9fafb', /* gray-50 */
    },
    orange: {
        '--background-from': '#ffedd5', /* orange-100 */
        '--background-to': '#fed7aa',   /* orange-200 */
        '--primary-text': '#7c2d12',    /* orange-900 */
        '--secondary-text': '#9a3412',  /* orange-700 */
        '--accent-text': '#c2410c',     /* orange-600 */
        '--button-bg': '#f97316',       /* orange-500 */
        '--button-bg-hover': '#ea580c', /* orange-600 */
        '--border-color': '#fed7aa',   /* orange-200 */
        '--border-focus-color': '#fb923c', /* orange-400 */
        '--outline-hover-bg': '#fff7ed', /* orange-50 */
    },
    red: {
        '--background-from': '#fee2e2', /* red-100 */
        '--background-to': '#fecaca',   /* red-200 */
        '--primary-text': '#7f1d1d',    /* red-900 */
        '--secondary-text': '#991b1b',  /* red-700 */
        '--accent-text': '#b91c1c',     /* red-600 */
        '--button-bg': '#ef4444',       /* red-500 */
        '--button-bg-hover': '#dc2626', /* red-600 */
        '--border-color': '#fecaca',   /* red-200 */
        '--border-focus-color': '#f87171', /* red-400 */
        '--outline-hover-bg': '#fef2f2', /* red-50 */
    }
};

export default function Layout({ children }) {
  const [themeName, setThemeName] = useState('amber');

  useEffect(() => {
    async function loadSettings() {
      try {
        const settingsData = await AppSettings.list();
        if (settingsData.length > 0 && settingsData[0].background_color) {
          setThemeName(settingsData[0].background_color);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    loadSettings();
  }, [children]);

  const theme = themes[themeName] || themes.amber;
  const bgStyle = {
      backgroundImage: `linear-gradient(to bottom right, var(--background-from), var(--background-to))`,
  };

  return (
    <div style={{...theme, ...bgStyle}} className={`min-h-screen font-sans`}>
      <main>
        {children}
      </main>
    </div>
  );
}
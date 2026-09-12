/**
 * Translation dictionaries. `tr` is the source language; `en` must mirror its shape.
 * Keys are resolved via dot-paths (e.g. t('nav.projects')). Missing keys fall back
 * to `tr`, and if missing there as well, to the key itself.
 *
 * When adding translations for a new page: move TR text here, write EN equivalent,
 * and replace hard-coded text in the component with t('...').
 */
import { projects } from './dict/projects'
import { projectDetail, repoSettings } from './dict/projectDetail'
import { memberDetail, members, teams } from './dict/members'
import { orgSettings, newProject } from './dict/orgSettings'
import { pulls, cart, ui } from './dict/misc'

export type Lang = 'tr' | 'en'

export const messages = {
  tr: {
    brand: 'Tidyorg',

    nav: {
      aria: 'Ana gezinme',
      projects: 'Projeler',
      members: 'Üyeler',
      teams: 'Takımlar',
      pulls: "Bekleyen PR'lar",
      org: 'Org Ayarları',
      pendingAria: '{n} bekleyen PR',
    },

    sync: {
      aria: 'Senkronizasyon durumu',
      inSync: 'Senkron',
      applying: 'Senkronize ediliyor…',
      error: 'Apply hatası',
      off: 'Senkron durumu kapalı',
      forbiddenHint:
        "Canlı senkron durumu için GitHub App'ine Actions (salt-okunur) izni ekleyin.",
    },

    theme: {
      system: 'Sistem teması',
      light: 'Açık tema',
      dark: 'Koyu tema',
      toggleAria: 'Tema: {label}. Değiştirmek için tıklayın.',
    },

    lang: {
      toggleAria: 'Dili değiştir (şu an {label})',
      tr: 'Türkçe',
      en: 'İngilizce',
    },

    auth: {
      signOut: 'Çıkış',
    },

    footer: {
      source: 'Konfigürasyon kaynağı:',
      note: '— her değişiklik PR olarak açılır, doğrudan yazılmaz.',
    },

    app: {
      booting: 'Oturum kontrol ediliyor…',
      notFoundTitle: 'Sayfa bulunamadı',
      backToProjects: 'Projelere dön',
    },

    login: {
      title: 'Tidyorg Yönetim Paneli',
      subtitle: 'Projeleri ve ekipleri GitHub üzerinden yönetin',
      signIn: 'GitHub ile giriş yap',
      authorizing: 'Giriş yapılıyor…',
    },

    projects: projects.tr,
    projectDetail: projectDetail.tr,
    repoSettings: repoSettings.tr,
    memberDetail: memberDetail.tr,
    members: members.tr,
    teams: teams.tr,
    orgSettings: orgSettings.tr,
    newProject: newProject.tr,
    pulls: pulls.tr,
    cart: cart.tr,
    ui: ui.tr,
  },

  en: {
    brand: 'Tidyorg',

    nav: {
      aria: 'Main navigation',
      projects: 'Projects',
      members: 'Members',
      teams: 'Teams',
      pulls: 'Pending PRs',
      org: 'Org Settings',
      pendingAria: '{n} pending PRs',
    },

    sync: {
      aria: 'Sync status',
      inSync: 'In sync',
      applying: 'Applying…',
      error: 'Apply failed',
      off: 'Sync status off',
      forbiddenHint: 'Add Actions (read-only) permission to the GitHub App for live sync status.',
    },

    theme: {
      system: 'System theme',
      light: 'Light theme',
      dark: 'Dark theme',
      toggleAria: 'Theme: {label}. Click to change.',
    },

    lang: {
      toggleAria: 'Change language (currently {label})',
      tr: 'Turkish',
      en: 'English',
    },

    auth: {
      signOut: 'Sign out',
    },

    footer: {
      source: 'Configuration source:',
      note: '— every change opens as a pull request, never written directly.',
    },

    app: {
      booting: 'Checking your session…',
      notFoundTitle: 'Page not found',
      backToProjects: 'Back to projects',
    },

    login: {
      title: 'Tidyorg Management Console',
      subtitle: 'Manage projects and teams through GitHub',
      signIn: 'Sign in with GitHub',
      authorizing: 'Signing in…',
    },

    projects: projects.en,
    projectDetail: projectDetail.en,
    repoSettings: repoSettings.en,
    memberDetail: memberDetail.en,
    members: members.en,
    teams: teams.en,
    orgSettings: orgSettings.en,
    newProject: newProject.en,
    pulls: pulls.en,
    cart: cart.en,
    ui: ui.en,
  },
} as const

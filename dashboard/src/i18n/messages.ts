/**
 * Çeviri sözlükleri. `tr` kaynak dildir; `en` aynı şekle sahip olmalı.
 * Anahtarlar nokta-yolu ile çözülür (ör. t('nav.projects')). Eksik anahtar
 * `tr`'ye, o da yoksa anahtarın kendisine düşer.
 *
 * Yeni sayfa çevirisi eklerken: TR metnini buraya taşı, EN karşılığını yaz,
 * bileşende hard-coded metni t('...') ile değiştir.
 */
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
      pendingAria: '{n} bekleyen PR',
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
  },

  en: {
    brand: 'Tidyorg',

    nav: {
      aria: 'Main navigation',
      projects: 'Projects',
      members: 'Members',
      teams: 'Teams',
      pulls: 'Pending PRs',
      pendingAria: '{n} pending PRs',
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
  },
} as const

/**
 * OrgSettings ve NewProject sayfalarının çeviri sözlükleri.
 * `tr` kaynak dildir; `en` aynı şekle sahip olmalı. Anahtarlar nokta-yolu ile
 * çözülür (ör. t('orgSettings.header.title')).
 */

export const orgSettings = {
  tr: {
    notFoundTitle: 'Org config bulunamadı',
    notFoundDesc: 'organization.yml okunamadı.',
    noFieldsChanged: 'Hiçbir alan değişmedi.',

    header: {
      title: 'Org Ayarları',
      intro: '— org geneli varsayılanlar, roller ve profil.',
      readOnly: 'Salt okunur',
      readOnlyTitle: 'Değiştirmek için org owner veya head-of-engineering olmalısın',
      openFile: 'Dosyayı aç ↗',
    },

    prCallout: {
      s1: 'Her kaydetme ',
      b1: 'bir PR açar',
      s2: "; merge edilene kadar GitHub'da hiçbir şey değişmez. Bu dosya CODEOWNERS korumalı — değişiklik ",
      b2: 'platform-admin onayı',
      s3: " gerektirir. 🔒 Org owner'lar (",
      s4: ') buradan ',
      b3: 'değiştirilemez',
      s5: '; yükseltme yalnızca elle PR + insan onayıyla olur.',
    },

    section: {
      profileTitle: 'Profil',
      profileHint: "GitHub'da görünen org kimliği (kozmetik).",
      generalTitle: 'Varsayılanlar — genel',
      generalHint: 'Her repo bunları miras alır, repo bazında ezilebilir.',
      securityTitle: 'Varsayılanlar — güvenlik',
      workflowsTitle: "Varsayılanlar — workflow'lar",
      workflowsHint: 'terraform/templates/.github/workflows/<ad>.yml',
      filesTitle: 'Varsayılanlar — şablon dosyaları',
      filesHint: 'strict = TF sahiplenir · seed = ilk oluşturmada · none = yazılmaz',
      labelsTitle: 'Varsayılanlar — seed etiketleri',
      labelsHint: "Repo kendi labels'ını tanımlamazsa bu set uygulanır.",
      branchesTitle: 'Varsayılanlar — dal koruması',
      branchesHint: 'Org geneli branch protection. Repo kendi dosyasında ezebilir.',
      rolesTitle: 'Roller',
      rolesHint: 'Yetkinin ne anlama geldiği. Repo dosyaları bu rol adlarını kullanır.',
      structuralTitle: 'Yapısal (salt-okunur)',
    },

    profile: {
      photo: 'Fotoğraf',
      changeOnGitHub: "GitHub'da değiştir ↗",
      photoHint:
        "Org fotoğrafı yalnızca GitHub arayüzünden değiştirilebilir — Terraform/API ile ayarlanamaz, o yüzden config'de tutulmuyor. Burada canlı hâli gösterilir.",
      name: 'Ad',
      description: 'Açıklama',
      blog: 'Blog / web',
      location: 'Konum',
    },

    general: {
      visibility: 'Görünürlük',
      defaultBranch: 'Varsayılan dal',
      hasIssues: 'Issues açık',
      hasProjects: 'Projects açık',
      hasWiki: 'Wiki açık',
    },

    security: {
      vulnAlerts: 'Dependabot uyarıları (vulnerability_alerts)',
      secretScanning: 'Secret scanning + push protection',
    },

    workflows: {
      ciWarning:
        "⚠️ `ci` yoksa `ci/test` status check'i hiç raporlanmaz — dal koruması onu bekliyorsa PR'lar takılır.",
    },

    labels: {
      empty: 'Etiket yok.',
      colorAria: 'Renk',
      namePlaceholder: 'ad',
      descPlaceholder: 'açıklama (ops.)',
      removeAria: 'Etiketi kaldır',
      add: '+ Etiket ekle',
    },

    branches: {
      empty: 'Tanımlı dal koruması yok.',
      requiredReviews: 'Onay sayısı',
      statusChecks: "Status check'ler (virgülle)",
      pushRoles: 'Push izinli roller (virgülle)',
      require_code_owner_review: 'CODEOWNERS onayı zorunlu',
      dismiss_stale_reviews: 'Yeni commit onayları düşürür',
      require_conversation_resolution: 'Tüm yorumlar çözülmeli',
      allow_force_push: 'Force push serbest',
      allow_deletions: 'Dal silme serbest',
    },

    roles: {
      warn1:
        " bir yükseltme yüzeyidir: açık bir rol, o rolü taşıyan herkese korumalı dallarda muafiyet verir. Değişiklik CODEOWNERS onayına takılır ama dikkatli ol. Owner'lık burada DEĞİL, ",
      warn2: "'da yaşar.",
      scope: 'Kapsam (scope)',
      repoPermission: 'Repo izni (repo_permission)',
    },

    structural: {
      hint1:
        'Gerçek GitHub org ayarları (base permission, repo-açma yetkisi, yeni-repo güvenlik varsayılanları, billing) ',
      hint2:
        "'te motorda tanımlı — config'de olmadığı için buradan düzenlenemez. Panele almak ayrı bir engine değişikliği gerektirir.",
    },

    save: {
      addToCart: 'Sepete ekle',
      save: 'Kaydet (PR aç)',
    },
  },

  en: {
    notFoundTitle: 'Org config not found',
    notFoundDesc: 'Could not read organization.yml.',
    noFieldsChanged: 'No fields changed.',

    header: {
      title: 'Org Settings',
      intro: '— org-wide defaults, roles and profile.',
      readOnly: 'Read-only',
      readOnlyTitle: 'You must be an org owner or head-of-engineering to make changes',
      openFile: 'Open file ↗',
    },

    prCallout: {
      s1: 'Every save ',
      b1: 'opens a PR',
      s2: '; nothing on GitHub changes until it is merged. This file is CODEOWNERS-protected — a change requires ',
      b2: 'platform-admin approval',
      s3: '. 🔒 Org owners (',
      s4: ') ',
      b3: 'cannot be changed from here',
      s5: '; escalation only happens through a manual PR + human approval.',
    },

    section: {
      profileTitle: 'Profile',
      profileHint: 'The org identity shown on GitHub (cosmetic).',
      generalTitle: 'Defaults — general',
      generalHint: 'Every repo inherits these; they can be overridden per repo.',
      securityTitle: 'Defaults — security',
      workflowsTitle: 'Defaults — workflows',
      workflowsHint: 'terraform/templates/.github/workflows/<name>.yml',
      filesTitle: 'Defaults — template files',
      filesHint: 'strict = TF owns · seed = on first creation · none = not written',
      labelsTitle: 'Defaults — seed labels',
      labelsHint: 'Applied when a repo does not define its own labels.',
      branchesTitle: 'Defaults — branch protection',
      branchesHint: 'Org-wide branch protection. A repo can override it in its own file.',
      rolesTitle: 'Roles',
      rolesHint: 'What each permission means. Repo files use these role names.',
      structuralTitle: 'Structural (read-only)',
    },

    profile: {
      photo: 'Photo',
      changeOnGitHub: 'Change on GitHub ↗',
      photoHint:
        'The org photo can only be changed from the GitHub interface — it cannot be set via Terraform/API, so it is not stored in config. The live version is shown here.',
      name: 'Name',
      description: 'Description',
      blog: 'Blog / web',
      location: 'Location',
    },

    general: {
      visibility: 'Visibility',
      defaultBranch: 'Default branch',
      hasIssues: 'Issues enabled',
      hasProjects: 'Projects enabled',
      hasWiki: 'Wiki enabled',
    },

    security: {
      vulnAlerts: 'Dependabot alerts (vulnerability_alerts)',
      secretScanning: 'Secret scanning + push protection',
    },

    workflows: {
      ciWarning:
        '⚠️ Without `ci`, the `ci/test` status check is never reported — if branch protection expects it, PRs will hang.',
    },

    labels: {
      empty: 'No labels.',
      colorAria: 'Color',
      namePlaceholder: 'name',
      descPlaceholder: 'description (opt.)',
      removeAria: 'Remove label',
      add: '+ Add label',
    },

    branches: {
      empty: 'No branch protection defined.',
      requiredReviews: 'Required approvals',
      statusChecks: 'Status checks (comma-separated)',
      pushRoles: 'Push-allowed roles (comma-separated)',
      require_code_owner_review: 'CODEOWNERS approval required',
      dismiss_stale_reviews: 'New commits dismiss approvals',
      require_conversation_resolution: 'All comments must be resolved',
      allow_force_push: 'Force push allowed',
      allow_deletions: 'Branch deletion allowed',
    },

    roles: {
      warn1:
        ' is an escalation surface: an enabled role grants everyone who holds it an exemption on protected branches. The change is gated by CODEOWNERS approval, but be careful. Ownership does NOT live here, it lives in ',
      warn2: '.',
      scope: 'Scope (scope)',
      repoPermission: 'Repo permission (repo_permission)',
    },

    structural: {
      hint1:
        'The real GitHub org settings (base permission, repo-creation permission, new-repo security defaults, billing) are defined in the engine in ',
      hint2:
        ' — since they are not in config, they cannot be edited here. Bringing them into the panel requires a separate engine change.',
    },

    save: {
      addToCart: 'Add to cart',
      save: 'Save (open PR)',
    },
  },
} as const

export const newProject = {
  tr: {
    steps: {
      repoInfo: 'Repo bilgileri',
      language: 'Dil',
      team: 'Ekip',
    },

    denied: {
      title: "Bu sayfa head of engineering'lere açık",
      desc: 'Yeni proje açma yetkisi organizasyon rolüne bağlıdır. Mentörler mevcut projelerine kişi ekleyebilir.',
      back: 'Projelere dön',
    },

    mentorRequired: "Her repo'nun en az bir mentörü olmalı.",

    backLink: '← Projeler',
    title: 'Yeni proje',
    intro:
      'Form bir config dosyası üretir ve PR açar. Repo, PR merge edildikten sonra Terraform tarafından oluşturulur.',

    repoName: 'Repo adı',
    repoNamePlaceholder: 'odeme-servisi',
    nameHint: 'Küçük harf, rakam ve tire. Dosya adı da bu olur:',

    description: 'Açıklama',
    descriptionPlaceholder: 'Ödeme geçidi entegrasyon servisi',

    start: 'Başlangıç',
    startWithCommit: 'İlk commit ile başlat',
    emptyRepo: 'Boş repo — kodu ben push edeceğim',
    startHint: {
      s1: 'Zaten kodu olan bir projeyi ',
      b1: 'taşıyorsan',
      s2: ' "Boş repo" seç: repo boş oluşur, sonra ',
      s3: ' ile geçmişi basarsın. "İlk commit" açıkken mevcut geçmişi push etmek "unrelated histories" çakışması yaratır.',
    },

    languageLabel: 'Programlama dili',
    languageHint: 'Görsel etiket için; CI dili repo dosyalarından otomatik algılar.',

    mentorsLabel: 'Mentörler',
    mentorsHint: "Repo'da admin yetkisi alır. En az bir mentör gerekli.",
    developersLabel: "Developer'lar",
    developersHint: "Repo'da push yetkisi alır; branch protection'a tabi. (Opsiyonel)",

    preview: 'Önizleme',
    previewFile: 'Şu dosya oluşturulacak:',
    mentorCount: '{n} mentör',
    developerCount: '{n} developer',
    previewPr: "PR açılacak — merge edilene kadar GitHub'da hiçbir şey değişmez.",
    previewHint: {
      s1: 'Görünürlük, dal koruması, şablonlar ve workflow\'lar org varsayılanlarını alır. Detaylı ayarları repo oluştuktan sonra projenin ',
      settings: 'Ayarlar',
      s2: ' ekranından yapabilirsin.',
    },

    back: 'Geri',
    next: 'Devam',
    create: 'Projeyi oluştur (PR aç)',
  },

  en: {
    steps: {
      repoInfo: 'Repo info',
      language: 'Language',
      team: 'Team',
    },

    denied: {
      title: 'This page is open to heads of engineering',
      desc: 'The permission to create a new project depends on your organization role. Mentors can add people to their existing projects.',
      back: 'Back to projects',
    },

    mentorRequired: 'Every repo must have at least one mentor.',

    backLink: '← Projects',
    title: 'New project',
    intro:
      'The form produces a config file and opens a PR. The repo is created by Terraform after the PR is merged.',

    repoName: 'Repo name',
    repoNamePlaceholder: 'payment-service',
    nameHint: 'Lowercase, digits and hyphens. This also becomes the file name:',

    description: 'Description',
    descriptionPlaceholder: 'Payment gateway integration service',

    start: 'Start',
    startWithCommit: 'Start with an initial commit',
    emptyRepo: 'Empty repo — I will push the code myself',
    startHint: {
      s1: 'If you are ',
      b1: 'migrating',
      s2: ' a project that already has code, choose "Empty repo": the repo is created empty, then you push the history with ',
      s3: '. When "Initial commit" is on, pushing the existing history creates an "unrelated histories" conflict.',
    },

    languageLabel: 'Programming language',
    languageHint: 'For a visual label only; CI detects the language automatically from the repo files.',

    mentorsLabel: 'Mentors',
    mentorsHint: 'Gets admin permission on the repo. At least one mentor is required.',
    developersLabel: 'Developers',
    developersHint: 'Gets push permission on the repo; subject to branch protection. (Optional)',

    preview: 'Preview',
    previewFile: 'This file will be created:',
    mentorCount: '{n} mentors',
    developerCount: '{n} developers',
    previewPr: 'A PR will be opened — nothing changes on GitHub until it is merged.',
    previewHint: {
      s1: "Visibility, branch protection, templates and workflows take the org defaults. You can configure detailed settings from the project's ",
      settings: 'Settings',
      s2: ' screen after the repo is created.',
    },

    back: 'Back',
    next: 'Continue',
    create: 'Create project (open PR)',
  },
} as const

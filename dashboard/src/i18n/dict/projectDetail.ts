/**
 * ProjectDetail sayfası ve RepoSettingsDialog bileşeni için çeviri sözlükleri.
 * `tr` kaynak dildir; `en` aynı anahtar şekline sahiptir. Anahtarlar bileşenlerde
 * namespace önekiyle çözülür: t('projectDetail.<key>'), t('repoSettings.<key>').
 */

export const projectDetail = {
  tr: {
    visibility: {
      privateTitle: 'Yalnızca org üyeleri görebilir',
      publicTitle: 'Herkese açık',
    },
    defaultParen: ' (varsayılan)',

    ruleCol: {
      branch: 'Dal',
      approvals: 'Onay',
      approvalsHint: 'Merge öncesi gereken onaylayan sayısı (required approving reviews).',
      codeowners: 'CODEOWNERS',
      codeownersHint: 'Değişen dosyanın CODEOWNERS sahibinden ayrıca onay isteniyor mu.',
      statusCheck: 'Status check',
      statusCheckHint: 'Merge öncesi yeşil olması gereken CI kontrolleri (ör. plan, test).',
      forcePush: 'Force push',
      forcePushHint: 'Geçmişi ezen zorla push izni. Kapalı = geçmiş korunur.',
      source: 'Kaynak',
      sourceHint: 'Varsayılan = org geneli kural; Repo = bu repo dosyasında geçersiz kılınmış.',
    },

    notFoundTitle: 'Proje bulunamadı',
    notFoundDesc: '"{name}" adında bir konfigürasyon dosyası yok.',
    backToProjects: 'Projelere dön',

    roleHeading: '{role}ler',
    archivedCannotEdit: 'Arşivlenmiş repo düzenlenemez',
    addRole: '{role} Ekle',
    noMembers: 'Henüz kimse yok.',
    removeMemberAria: '{login} kişisini çıkar',

    backLink: '← Projeler',
    archivedBadge: 'Arşivli',
    readonlyTitle: 'Bu projeyi düzenlemek için mentör veya owner olmalısın',
    readonly: 'Salt okunur',
    noDescription: 'Açıklama yok',
    settings: '⚙ Ayarlar',
    unarchive: 'Arşivden çıkar',
    archive: '🗄 Arşivle',
    openInGitHub: "GitHub'da aç ↗",

    metaLanguage: 'Dil',
    metaVisibility: 'Görünürlük',
    metaDefaultBranch: 'Varsayılan dal',
    metaConfigFile: 'Config dosyası',

    branchProtection: 'Dal koruması',
    branchProtectionHint: 'Repo dosyasında yazmayan alanlar organizasyon varsayılanından gelir.',
    protectionRemovedPre: "Koruma kaldırılmış (config'de ",
    protectionRemovedPost: ')',
    cellRequired: 'Zorunlu',
    cellNo: 'Hayır',
    cellOn: 'Açık',
    cellOff: 'Kapalı',
    sourceRepo: 'Repo',
    sourceDefault: 'Varsayılan',
    noBranchRules: 'Tanımlı dal koruması yok.',

    labelsHeading: 'Etiketler',
    labelsCustomBadge: 'Bu repoya özel',
    labelsInheritedBadge: 'Org varsayılanı (miras)',
    labelsCustomHint:
      'Bu repo kendi etiket setini tanımlıyor; org varsayılanının yerine geçer. Issue ve PR’larda bu etiketler kullanılabilir.',
    labelsInheritedHint:
      'Org genel etiket seti miras alınıyor. Bu repoya özel bir set için ⚙ Ayarlar → Etiketler.',
    noLabels: 'Etiket yok.',

    addRoleTitle: '{role} Ekle — {name}',
    cancel: 'Vazgeç',
    addToCart: 'Sepete ekle',
    addPeoplePr: '{count} kişiyi ekle (PR)',
    createPr: 'PR oluştur',
    selectRole: '{role} seç',
    addHint:
      "Yalnızca org üyeleri. Seçtiklerin tek PR'da eklenir; merge edilince repo'da yetkilenir.",

    removeTitle: '{login} çıkarılsın mı?',
    removeMessage:
      ", {name} projesinin {role} listesinden çıkarılacak. Bu işlem bir PR açar; merge edilene kadar GitHub'da hiçbir şey değişmez.",
    removeAndPr: 'Çıkar ve PR aç',

    unarchiveTitle: '{name} arşivden çıkarılsın mı?',
    archiveTitle: '{name} arşivlensin mi?',
    unarchiveMsgPre: ' tekrar yazılabilir hale gelir (',
    unarchiveMsgPost: '). Bu işlem bir PR açar.',
    archiveMsgPre:
      ' arşivlenir: repo dondurulur (read-only), tüm içerik ve geçmiş korunur, istediğinde geri alınır (',
    archiveMsgPost:
      "). Bir PR açılır; merge edilene kadar GitHub'da hiçbir şey değişmez.",
    unarchiveAndPr: 'Arşivden çıkar ve PR aç',
    archiveAndPr: 'Arşivle ve PR aç',
  },

  en: {
    visibility: {
      privateTitle: 'Only org members can see it',
      publicTitle: 'Public',
    },
    defaultParen: ' (default)',

    ruleCol: {
      branch: 'Branch',
      approvals: 'Approvals',
      approvalsHint: 'Number of required approving reviews before merge.',
      codeowners: 'CODEOWNERS',
      codeownersHint:
        'Whether a separate approval from the CODEOWNERS owner of the changed file is required.',
      statusCheck: 'Status check',
      statusCheckHint: 'CI checks that must be green before merge (e.g. plan, test).',
      forcePush: 'Force push',
      forcePushHint: 'Permission to force-push over history. Off = history is preserved.',
      source: 'Source',
      sourceHint: 'Default = org-wide rule; Repo = overridden in this repo file.',
    },

    notFoundTitle: 'Project not found',
    notFoundDesc: 'There is no configuration file named "{name}".',
    backToProjects: 'Back to projects',

    roleHeading: '{role}s',
    archivedCannotEdit: 'An archived repo cannot be edited',
    addRole: 'Add {role}',
    noMembers: 'No one yet.',
    removeMemberAria: 'Remove {login}',

    backLink: '← Projects',
    archivedBadge: 'Archived',
    readonlyTitle: 'You must be a mentor or owner to edit this project',
    readonly: 'Read-only',
    noDescription: 'No description',
    settings: '⚙ Settings',
    unarchive: 'Unarchive',
    archive: '🗄 Archive',
    openInGitHub: 'Open on GitHub ↗',

    metaLanguage: 'Language',
    metaVisibility: 'Visibility',
    metaDefaultBranch: 'Default branch',
    metaConfigFile: 'Config file',

    branchProtection: 'Branch protection',
    branchProtectionHint: 'Fields not set in the repo file come from the organization default.',
    protectionRemovedPre: 'Protection removed (',
    protectionRemovedPost: ' in config)',
    cellRequired: 'Required',
    cellNo: 'No',
    cellOn: 'On',
    cellOff: 'Off',
    sourceRepo: 'Repo',
    sourceDefault: 'Default',
    noBranchRules: 'No branch protection defined.',

    labelsHeading: 'Labels',
    labelsCustomBadge: 'Specific to this repo',
    labelsInheritedBadge: 'Org default (inherited)',
    labelsCustomHint:
      'This repo defines its own label set; it replaces the org default. These labels can be used on issues and PRs.',
    labelsInheritedHint:
      'The org-wide label set is inherited. For a set specific to this repo, use ⚙ Settings → Labels.',
    noLabels: 'No labels.',

    addRoleTitle: 'Add {role} — {name}',
    cancel: 'Cancel',
    addToCart: 'Add to cart',
    addPeoplePr: 'Add {count} people (PR)',
    createPr: 'Create PR',
    selectRole: 'Select {role}',
    addHint:
      'Org members only. The ones you select are added in a single PR; once merged they are granted access on the repo.',

    removeTitle: 'Remove {login}?',
    removeMessage:
      ' will be removed from the {role} list of {name}. This opens a PR; nothing changes on GitHub until it is merged.',
    removeAndPr: 'Remove and open PR',

    unarchiveTitle: 'Unarchive {name}?',
    archiveTitle: 'Archive {name}?',
    unarchiveMsgPre: ' becomes writable again (',
    unarchiveMsgPost: '). This opens a PR.',
    archiveMsgPre:
      ' will be archived: the repo is frozen (read-only), all content and history are preserved, and it can be reverted anytime (',
    archiveMsgPost: '). A PR is opened; nothing changes on GitHub until it is merged.',
    unarchiveAndPr: 'Unarchive and open PR',
    archiveAndPr: 'Archive and open PR',
  },
} as const

export const repoSettings = {
  tr: {
    branchBool: {
      codeOwners: 'CODEOWNERS onayı zorunlu',
      dismissStale: 'Yeni commit onayları düşürür',
      conversation: 'Tüm yorumlar çözülmeli',
      forcePush: 'Force push serbest',
      deletions: 'Dal silme serbest',
    },

    noChanges: 'Hiçbir alan değişmedi.',
    dialogTitle: 'Repo ayarları — {name}',
    cancel: 'Vazgeç',

    sectionBasic: 'Temel',
    labelDescription: 'Açıklama',
    labelLanguage: 'Programlama dili',

    sectionRepo: 'Repo ayarları',
    labelVisibility: 'Görünürlük',
    optInheritOrg: 'Varsayılan (org)',
    labelDefaultBranch: 'Varsayılan dal',
    phDefaultBranch: 'varsayılan (org)',
    triArchived: 'Arşivlenmiş',
    triIssues: 'Issues açık',
    triProjects: 'Projects açık',
    triWiki: 'Wiki açık',

    sectionSecurity: 'Güvenlik',
    triVulnAlerts: 'Dependabot uyarıları (vulnerability_alerts)',
    triSecretScanning: 'Secret scanning + push protection',
    hintSecretScanning:
      "secret scanning yalnızca public repo'da ücretsiz; private repo GHAS ister, modül sessizce atlar.",

    sectionTemplateFiles: 'Şablon dosyaları',
    optDefault: 'Varsayılan',

    sectionWorkflows: "Workflow'lar",
    overrideOrgDefault: 'Org varsayılanını ez',
    hintCi:
      "⚠️ `ci` yoksa `ci/test` status check'i hiç raporlanmaz — dal koruması onu bekliyorsa PR'lar takılır.",

    sectionBranchProtection: 'Dal koruması',
    optOrgDefault: 'Org varsayılanı',
    optCustomRule: 'Özel kural',
    optRemoveProtection: 'Korumayı kaldır (null)',
    labelApprovalCount: 'Onay sayısı',
    labelStatusChecks: "Status check'ler (virgülle)",
    labelPushRoles: 'Push izinli roller (virgülle)',

    sectionCodeowners: 'CODEOWNERS (yol → kişiler)',
    ariaRemoveRow: 'Satırı kaldır',
    addPath: 'Yol ekle',

    sectionLabels: 'Etiketler (issue label seti)',
    overrideLabelsToggle: 'Org varsayılanını ez (bu repoya özel set)',
    hintInheritLabels:
      "Org genel etiket seti miras alınıyor ({count} etiket). Ez'i işaretlersen org setinin bir kopyasıyla başlar, bu repoya özel düzenlersin.",
    hintEmptyLabelsPre: '⚠️ Liste boş — kaydedersen bu repoda hiç etiket kalmaz (',
    hintEmptyLabelsPost: ').',
    phLabelName: 'ad (örn. type: bug)',
    phLabelDescription: 'açıklama (opsiyonel)',
    ariaColor: 'Renk',
    ariaRemoveLabel: 'Etiketi kaldır',
    addLabel: 'Etiket ekle',

    triOn: 'Açık',
    triOff: 'Kapalı',
  },

  en: {
    branchBool: {
      codeOwners: 'CODEOWNERS approval required',
      dismissStale: 'New commits dismiss approvals',
      conversation: 'All conversations must be resolved',
      forcePush: 'Force push allowed',
      deletions: 'Branch deletion allowed',
    },

    noChanges: 'No fields changed.',
    dialogTitle: 'Repo settings — {name}',
    cancel: 'Cancel',

    sectionBasic: 'Basic',
    labelDescription: 'Description',
    labelLanguage: 'Programming language',

    sectionRepo: 'Repo settings',
    labelVisibility: 'Visibility',
    optInheritOrg: 'Default (org)',
    labelDefaultBranch: 'Default branch',
    phDefaultBranch: 'default (org)',
    triArchived: 'Archived',
    triIssues: 'Issues enabled',
    triProjects: 'Projects enabled',
    triWiki: 'Wiki enabled',

    sectionSecurity: 'Security',
    triVulnAlerts: 'Dependabot alerts (vulnerability_alerts)',
    triSecretScanning: 'Secret scanning + push protection',
    hintSecretScanning:
      'secret scanning is free only on public repos; private repos require GHAS, the module silently skips it.',

    sectionTemplateFiles: 'Template files',
    optDefault: 'Default',

    sectionWorkflows: 'Workflows',
    overrideOrgDefault: 'Override org default',
    hintCi:
      '⚠️ Without `ci`, the `ci/test` status check is never reported — if branch protection expects it, PRs will get stuck.',

    sectionBranchProtection: 'Branch protection',
    optOrgDefault: 'Org default',
    optCustomRule: 'Custom rule',
    optRemoveProtection: 'Remove protection (null)',
    labelApprovalCount: 'Approval count',
    labelStatusChecks: 'Status checks (comma-separated)',
    labelPushRoles: 'Roles allowed to push (comma-separated)',

    sectionCodeowners: 'CODEOWNERS (path → people)',
    ariaRemoveRow: 'Remove row',
    addPath: 'Add path',

    sectionLabels: 'Labels (issue label set)',
    overrideLabelsToggle: 'Override org default (set specific to this repo)',
    hintInheritLabels:
      'The org-wide label set is inherited ({count} labels). If you check Override, it starts with a copy of the org set and you edit it specifically for this repo.',
    hintEmptyLabelsPre: '⚠️ The list is empty — if you save, this repo will have no labels (',
    hintEmptyLabelsPost: ').',
    phLabelName: 'name (e.g. type: bug)',
    phLabelDescription: 'description (optional)',
    ariaColor: 'Color',
    ariaRemoveLabel: 'Remove label',
    addLabel: 'Add label',

    triOn: 'On',
    triOff: 'Off',
  },
} as const

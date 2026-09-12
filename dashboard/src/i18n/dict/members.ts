/**
 * Translation dictionaries for member / team pages.
 * `tr` is the source language; `en` has the same structure (every `tr` key exists in `en`).
 * Keys are resolved via dot-path (e.g. t('members.title')).
 */

export const memberDetail = {
  tr: {
    projects: 'Projeler',
    orgOwner: 'org owner',
    orgMember: 'org üyesi',
    notInPeople: 'people.yml içinde kayıtlı değil',
    githubProfile: 'GitHub profili',

    orgMembership: 'Organizasyon üyeliği',
    fully: 'tamamen',
    orgMembershipDesc1: 'Kişiyi organizasyondan ',
    orgMembershipDesc2: ' çıkarır: önce bulunduğu tüm repo rollerinden, sonra ',
    orgMembershipDesc3:
      ' üyeliğinden — tek PR’da. Owner / head-of-engineering yetkisi buradan değiştirilemez (',
    orgMembershipDesc4: ' içindedir).',
    removeOrgFullyBtn: 'Org’dan tamamen çıkar',

    emptyProjectsTitle: 'Bu kişi hiçbir projede görünmüyor',
    emptyProjectsDesc: 'Konfigürasyondaki mentör, developer veya viewer listelerinde adı geçmiyor.',
    colProject: 'Proje',
    colRole: 'Rol',
    colLanguage: 'Dil',
    roleInProject: '{project} içindeki rol',
    removeFromRepo: 'Repodan çıkar',

    roleChangeTitle: '{project} — rol değişikliği',
    roleChangeRepoMid: ' reposunda ',
    roleChangeRemoveSuffix: ' rolünden çıkarılacak (repodan tamamen)',
    roleChangePrNote: '. Bir PR açar; merge edilene kadar GitHub’da değişmez.',
    soleMentorWarnPre:
      '{login} bu repo’nun tek mentörü — bu değişiklik repo’yu mentörsüz bırakır ve ',
    planRejected: 'plan aşamasında reddedilir',
    soleMentorWarnPost: '. Önce başka bir mentör ata.',

    addToCart: 'Sepete ekle',
    roleChangeConfirm: 'Değiştir ve PR aç',

    removeOrgTitle: '{login} organizasyondan çıkarılsın mı?',
    removeOrgDesc1: ' organizasyondan ',
    removeOrgDesc2: ' çıkarılacak: önce bulunduğu tüm repo rollerinden, sonra ',
    removeOrgDesc3:
      ' üyeliğinden — hepsi tek PR’da. Merge edilene kadar GitHub’da hiçbir şey değişmez; merge sonrası kişi org üyesi olmaktan çıkar ve erişimi kalmaz.',
    removeOrgReversible: '(Geri alınabilir: tekrar üye olarak eklersen yeni bir davet gider.)',
    reposToRemove: 'Çıkarılacağı repolar',
    soleMentorTag: 'tek mentör',
    noRoleAnyRepo: 'Hiçbir repoda rolü yok; yalnızca üyelikten çıkarılacak.',
    soleMentorCount: '⚠️ Bu kişi {n} repo’nun TEK mentörü',
    soleMentorReposMid:
      ' mentörsüz kalır. Engine bir repo’yu mentörsüz kabul etmez → bu PR ',
    soleMentorReposPost: '. Önce bu repolara başka bir mentör atayın, sonra çıkarın.',
    removeOrgConfirm: 'Org’dan çıkar ve PR aç',
  },
  en: {
    projects: 'Projects',
    orgOwner: 'org owner',
    orgMember: 'org member',
    notInPeople: 'not registered in people.yml',
    githubProfile: 'GitHub profile',

    orgMembership: 'Organization membership',
    fully: 'entirely',
    orgMembershipDesc1: 'Removes the person from the organization ',
    orgMembershipDesc2: ': first from all their repo roles, then from ',
    orgMembershipDesc3:
      ' membership — in a single PR. Owner / head-of-engineering permission cannot be changed here (in',
    orgMembershipDesc4: ').',
    removeOrgFullyBtn: 'Remove from org entirely',

    emptyProjectsTitle: 'This person appears in no projects',
    emptyProjectsDesc: 'Their name is not in any mentor, developer, or viewer list in the configuration.',
    colProject: 'Project',
    colRole: 'Role',
    colLanguage: 'Language',
    roleInProject: 'Role in {project}',
    removeFromRepo: 'Remove from repo',

    roleChangeTitle: '{project} — role change',
    roleChangeRepoMid: ' repo — ',
    roleChangeRemoveSuffix: ' role will be removed (entirely from the repo)',
    roleChangePrNote: '. Opens a PR; nothing changes on GitHub until merged.',
    soleMentorWarnPre:
      '{login} is the only mentor of this repo — this change would leave the repo without a mentor and ',
    planRejected: 'will be rejected at the plan stage',
    soleMentorWarnPost: '. Assign another mentor first.',

    addToCart: 'Add to cart',
    roleChangeConfirm: 'Change and open PR',

    removeOrgTitle: 'Remove {login} from the organization?',
    removeOrgDesc1: ' will be removed from the organization ',
    removeOrgDesc2: ': first from all their repo roles, then from ',
    removeOrgDesc3:
      ' membership — all in a single PR. Nothing changes on GitHub until merged; after merge the person is no longer an org member and loses access.',
    removeOrgReversible: '(Reversible: if you add them as a member again, a new invite is sent.)',
    reposToRemove: 'Repos to be removed from',
    soleMentorTag: 'only mentor',
    noRoleAnyRepo: 'No role in any repo; will only be removed from membership.',
    soleMentorCount: '⚠️ This person is the ONLY mentor of {n} repos',
    soleMentorReposMid:
      ' will be left without a mentor. The engine will not accept a repo without a mentor → this PR ',
    soleMentorReposPost: '. Assign another mentor to these repos first, then remove.',
    removeOrgConfirm: 'Remove from org and open PR',
  },
} as const

export const members = {
  tr: {
    title: 'Üyeler',
    loading: 'Konfigürasyon okunuyor…',
    count: '{n} org üyesi · roller config’ten türetildi',
    searchPlaceholder: 'Üye ara…',
    searchAria: 'Üye ara',
    filterAria: 'Role göre filtrele',
    filterAll: 'Tüm roller',
    role: {
      owner: 'Owner',
      'head-of-engineering': 'Head of Eng',
      mentor: 'Mentör',
      developer: 'Developer',
      viewer: 'Viewer',
    },
    emptyNoneTitle: 'Henüz üye yok',
    emptyMatchTitle: 'Eşleşen üye yok',
    emptyNoneDesc: 'config/people.yml içinde üye bulunamadı.',
    emptyMatchDesc: 'Arama veya rol filtresini değiştirmeyi deneyin.',
    memberOnly: 'yalnızca üye',
  },
  en: {
    title: 'Members',
    loading: 'Reading configuration…',
    count: '{n} org members · roles derived from config',
    searchPlaceholder: 'Search member…',
    searchAria: 'Search member',
    filterAria: 'Filter by role',
    filterAll: 'All roles',
    role: {
      owner: 'Owner',
      'head-of-engineering': 'Head of Eng',
      mentor: 'Mentor',
      developer: 'Developer',
      viewer: 'Viewer',
    },
    emptyNoneTitle: 'No members yet',
    emptyMatchTitle: 'No matching members',
    emptyNoneDesc: 'No members found in config/people.yml.',
    emptyMatchDesc: 'Try changing the search or role filter.',
    memberOnly: 'member only',
  },
} as const

export const teams = {
  tr: {
    title: 'Takımlar',
    loading: 'Konfigürasyon okunuyor…',
    subtitle:
      'Her repo bir takım — mentörler admin, developer’lar push. Config’ten türetildi.',
    clusterAria: '{hub} takımı, {n} üye',
    role: {
      mentor: 'Mentör (admin)',
      developer: 'Developer (push)',
      viewer: 'Viewer (pull)',
      admin: 'Org admin',
    },
    emptyTitle: 'Takım yok',
    emptyDesc: 'Config’te repo/takım bulunamadı.',
    noMembers: 'üye yok',
  },
  en: {
    title: 'Teams',
    loading: 'Reading configuration…',
    subtitle: 'Each repo is a team — mentors are admins, developers push. Derived from config.',
    clusterAria: '{hub} team, {n} members',
    role: {
      mentor: 'Mentor (admin)',
      developer: 'Developer (push)',
      viewer: 'Viewer (pull)',
      admin: 'Org admin',
    },
    emptyTitle: 'No teams',
    emptyDesc: 'No repos/teams found in config.',
    noMembers: 'no members',
  },
} as const

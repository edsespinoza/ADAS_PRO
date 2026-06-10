---
name: AUTH — API Pública
description: Todas as funções expostas pelo módulo AUTH (retorno do IIFE)
---

# AUTH — API Pública

```js
// Inicialização (sempre chamar primeiro — idempotente)
await AUTH.init()
AUTH.reset()                        // anula _initPromise (força re-init)

// Sessão
AUTH.getSession()                   // → Session | null (checa expiração + blocked)
AUTH.requireAuth(role?)             // → Session | redireciona para login.html
AUTH.logout()                       // limpa sessão + signOut Supabase

// Autenticação
await AUTH.login(email, password)   // → { ok, user?, session?, msg }
await AUTH.register(data)           // → { ok, msg }
  // data: { name, email, password, level }
  // level válidos: 'tecnico'|'oficina'|'autocenter'|'parabrisa'|'gestor'|'outro'

// MFA
AUTH.getPendingMfaUser()            // → User | null (_pendingMfaUser)
await AUTH.verifyMFA(code)          // → { ok, user?, session?, msg }
await AUTH.getMfaLevel()            // → { currentLevel, nextLevel } | null (só modo supabase)

// Roles e permissões
AUTH.hasRole(userRole, required)    // → boolean (hierarquia numérica)
AUTH.canViewContent(userId, itemId) // → boolean (verifica accessLevel vs plano)
AUTH.canDownloadContent(userId, itemId) // → boolean (verifica downloadLevel vs plano)
AUTH.getUserAccessLevel(userId)     // → número 1–4 baseado no plano

// Usuários (admin+)
AUTH.getAllUsers()                   // → User[]
AUTH.getUserById(id)                // → User | null
AUTH.getUserByEmail(email)          // → User | null
AUTH.getPendingCount()              // → number (usuários com status 'pending')
await AUTH.approveUser(id)          // → { ok }
await AUTH.blockUser(id)            // → { ok }
await AUTH.unblockUser(id)          // → { ok }
await AUTH.updateUserRole(id, role) // → { ok }
await AUTH.updateUserPermissions(id, permissions[]) // → { ok }
await AUTH.deleteUser(id)           // → { ok }
await AUTH.createUserDirect(data)   // → { ok, user? } (cria sem Supabase Auth, só public.users)
await AUTH.applyPlanToUser(id, planId) // → { ok } (atualiza plan + permissions do plano)
AUTH.isAccessValid(user)            // → boolean (checa accessExpires)
AUTH.getUserPlan(userId)            // → Plan | null
AUTH.setUserPlan(userId, planId)    // → void

// Upload / Storage
await AUTH.uploadFile(file, storagePath) // → { ok, path? } — bucket 'materiais', path ex: 'honda/honda-lkas.pdf'
await AUTH.getSignedUrl(storagePath)     // → { ok, url? } — URL assinada 1h via Edge Function get-download-url
AUTH.trackDownload(userId, itemId)       // → void (registra em audit_logs)

// Tickets
AUTH.getAllTickets()                 // → Ticket[]
AUTH.getUserTickets(userId)         // → Ticket[]
AUTH.getTicketById(id)              // → Ticket | null
AUTH.getOpenTicketsCount()          // → number
await AUTH.createTicket(data)       // → { ok, ticket? }
await AUTH.replyTicket(id, msg, from) // → { ok }
await AUTH.updateTicketStatus(id, status) // → { ok }
await AUTH.deleteTicket(id)         // → { ok }

// Conteúdo (biblioteca de PDFs)
AUTH.getContent(filter?)            // → Content[]
AUTH.getContentForUser(userId)      // → Content[] (filtrado por permissões)
AUTH.getDefaultContent()            // → Content[] (22 PDFs hard-coded, todos com filePath:null)
await AUTH.addContent(data)         // → { ok }
await AUTH.editContent(id, patch)   // → { ok }
await AUTH.deleteContent(id)        // → { ok }

// Artigos editoriais
AUTH.getArticles()                  // → Article[]
AUTH.getArticleById(id)             // → Article | null
await AUTH.addArticle(data)         // → { ok }
await AUTH.editArticle(id, patch)   // → { ok }
await AUTH.deleteArticle(id)        // → { ok }
await AUTH.publishArticle(id)       // → { ok }
await AUTH.archiveArticle(id)       // → { ok }

// Boletins técnicos
AUTH.getBulletins()                 // → Bulletin[]
AUTH.getBulletinById(id)            // → Bulletin | null
await AUTH.addBulletin(data)        // → { ok }
await AUTH.editBulletin(id, patch)  // → { ok }
await AUTH.deleteBulletin(id)       // → { ok }
await AUTH.publishBulletin(id)      // → { ok }
await AUTH.archiveBulletin(id)      // → { ok }

// Notificações
AUTH.getNotifications()             // → Notif[]
AUTH.getUnreadCount()               // → number
AUTH.addNotification(data)          // → void
AUTH.markNotifRead(id)              // → void
AUTH.clearAllNotifs()               // → void

// Configurações (superadmin)
AUTH.getSettings()                  // → Settings
await AUTH.saveSettings(patch)      // → { ok }

// Auditoria e segurança
await AUTH.logAudit(action, targetId, details) // → void (registra em audit_logs via try/catch+await)
await AUTH.callEdgeFunction(name, body)        // → { ok, ... }

// Recuperação de senha
await AUTH.resetPassword(email)     // → { ok, msg } (envia email Supabase)
await AUTH.updatePassword(newPass)  // → { ok, msg } (usa onAuthStateChange PASSWORD_RECOVERY)

// Estado e diagnóstico
AUTH.isOfflineMode()                // → boolean (_offlineMode)
AUTH.onAuthStateChange(cb)          // → void — proxy para _sb.auth.onAuthStateChange(cb); só funciona online
AUTH.getStats()                     // → { totalUsers, activeUsers, pendingUsers, openTickets, totalContent }
AUTH.getVersion()                   // → { ...VERSION }
AUTH.getCategories()                // → Category[] (12 categorias)
AUTH.VERSION                        // objeto de versão completo
AUTH.PLANS                          // array de planos
AUTH.DEFAULT_SETTINGS               // objeto de configurações padrão

// Utilitários (uso interno / admin)
AUTH.exportData()                   // → JSON snapshot de todos os dados localStorage
AUTH.importData(json)               // → void
AUTH.resetToDefaults()              // → void (restaura 22 PDFs padrão)
AUTH.seedDemoData()                 // → void
AUTH.enterDemoMode()                // → void
```

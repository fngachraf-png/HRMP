#!/usr/bin/env python3
# المرحلة 5 — إضافة مفاتيح الترجمة (coverage + notifications + sourceReplacement + ترقية الملاحظة) للغات الأربع
import json
import sys

BASE = "/home/z/my-project/src/i18n/dictionaries/"

# مفاتيح dashboard.coverage + shifts.sourceReplacement + phaseNoteBody الجديدة لكل لغة
DASH = {
    "ar": {"coverage": "التغطية السريعة"},
    "fr": {"coverage": "Remplacement rapide"},
    "en": {"coverage": "Quick coverage"},
    "es": {"coverage": "Cobertura rápida"},
}
SHIFT_SRC = {
    "ar": "وردية تغطية",
    "fr": "Remplacement",
    "en": "Coverage",
    "es": "Cobertura",
}
PHASE_NOTE = {
    "ar": "أنت تستخدم الإصدار 0.5.0 (المرحلة 5: التغطية السريعة والإشعارات — سحب بديل عند الغياب مع منع تعارض الورديات، إشعار فوري للبديل داخل التطبيق ودفع المتصفح، وتحديث برنامجه فورًا). الوحدات التالية تُبنى تباعاً وفق خطة المواصفة.",
    "fr": "Vous utilisez la version 0.5.0 (Phase 5 : remplacement rapide et notifications — remplacement d'un agent absent avec prévention des conflits de poste, notification instantanée dans l'application et push navigateur, et mise à jour immédiate de son programme). Les modules suivants seront construits progressivement selon la spécification.",
    "en": "You are using version 0.5.0 (Phase 5: quick coverage & notifications — pull a replacement for an absent worker with shift-conflict prevention, instant in-app and browser-push notification, and immediate schedule update). Remaining modules are built progressively per the specification.",
    "es": "Está usando la versión 0.5.0 (Fase 5: cobertura rápida y notificaciones — asignación de un sustituto ante una ausencia con prevención de conflictos de turnos, notificación instantánea en la aplicación y push del navegador, y actualización inmediata de su programa). Los módulos restantes se construyen progresivamente según la especificación.",
}

COVERAGE = {
    "ar": {
        "title": "التغطية السريعة",
        "subtitle": "سحب بديل عند الغياب — المتاحون فقط بلا تعارض، ويُخطَر البديل فورًا",
        "date": "التاريخ",
        "boardTitle": "ورديات اليوم",
        "totalShifts": "وردية",
        "present": "حاضر",
        "absent": "غائب مرجّحًا",
        "empty": "لا ورديات مجدولة في هذا التاريخ",
        "attIn": "سجّل الدخول",
        "attOut": "سجّل الخروج",
        "attPending": "بانتظار مراجعة",
        "attNone": "بلا تسجيل",
        "absentLikely": "انقضت 30 دقيقة عن البداية بلا تسجيل — يُنصح بسحب بديل",
        "replaceAction": "سحب بديل",
        "replaceTitle": "سحب بديل للوردية",
        "replaceFor": "الموقع:",
        "replaceWindow": "النافذة:",
        "noAvailable": "لا عمال متاحين لهذه النافذة (الكل متعارض)",
        "freeAllDay": "حرّ طوال اليوم",
        "sameDayShifts": "وردياته اليوم",
        "reason": "السبب (اختياري — يُوثَّق في التدقيق)",
        "reasonPlaceholder": "مثال: غياب غير مبلَّغ",
        "confirmReplace": "تأكيد السحب",
        "replaced": "سُحب البديل وأُخطِر بإشعار فوري",
        "conflictRejected": "مرفوض: البديل لديه وردية متعارضة",
        "availableLoadError": "تعذّر تحميل العمال المتاحين",
        "replaceError": "تعذّر سحب البديل",
    },
    "fr": {
        "title": "Remplacement rapide",
        "subtitle": "Tirer un remplaçant en cas d'absence — disponibles sans conflit, prévenu instantanément",
        "date": "Date",
        "boardTitle": "Postes du jour",
        "totalShifts": "postes",
        "present": "présents",
        "absent": "absences probables",
        "empty": "Aucun poste planifié à cette date",
        "attIn": "Entrée pointée",
        "attOut": "Sortie pointée",
        "attPending": "En attente de validation",
        "attNone": "Sans pointage",
        "absentLikely": "30 minutes écoulées sans pointage — remplacement conseillé",
        "replaceAction": "Tirer un remplaçant",
        "replaceTitle": "Remplacement du poste",
        "replaceFor": "Site :",
        "replaceWindow": "Créneau :",
        "noAvailable": "Aucun agent disponible pour ce créneau (tous en conflit)",
        "freeAllDay": "Libre toute la journée",
        "sameDayShifts": "Ses postes du jour",
        "reason": "Motif (optionnel — consigné dans l'audit)",
        "reasonPlaceholder": "Ex. : absence non signalée",
        "confirmReplace": "Confirmer le remplacement",
        "replaced": "Remplaçant tiré et notifié instantanément",
        "conflictRejected": "Refusé : le remplaçant a un poste en conflit",
        "availableLoadError": "Impossible de charger les agents disponibles",
        "replaceError": "Échec du remplacement",
    },
    "en": {
        "title": "Quick coverage",
        "subtitle": "Pull a replacement for an absence — conflict-free workers only, notified instantly",
        "date": "Date",
        "boardTitle": "Today's shifts",
        "totalShifts": "shifts",
        "present": "present",
        "absent": "likely absent",
        "empty": "No scheduled shifts on this date",
        "attIn": "Checked in",
        "attOut": "Checked out",
        "attPending": "Pending review",
        "attNone": "No check-in",
        "absentLikely": "30 minutes past start with no check-in — replacement advised",
        "replaceAction": "Pull replacement",
        "replaceTitle": "Pull a replacement",
        "replaceFor": "Site:",
        "replaceWindow": "Window:",
        "noAvailable": "No available workers for this window (all conflicted)",
        "freeAllDay": "Free all day",
        "sameDayShifts": "Their shifts today",
        "reason": "Reason (optional — recorded in audit)",
        "reasonPlaceholder": "E.g. unreported absence",
        "confirmReplace": "Confirm replacement",
        "replaced": "Replacement pulled and notified instantly",
        "conflictRejected": "Rejected: replacement has a conflicting shift",
        "availableLoadError": "Failed to load available workers",
        "replaceError": "Failed to pull replacement",
    },
    "es": {
        "title": "Cobertura rápida",
        "subtitle": "Asignar un sustituto ante una ausencia — solo disponibles sin conflicto, avisado al instante",
        "date": "Fecha",
        "boardTitle": "Turnos del día",
        "totalShifts": "turnos",
        "present": "presentes",
        "absent": "ausencias probables",
        "empty": "No hay turnos programados en esta fecha",
        "attIn": "Entrada registrada",
        "attOut": "Salida registrada",
        "attPending": "Pendiente de revisión",
        "attNone": "Sin registro",
        "absentLikely": "30 minutos tras el inicio sin registro — se recomienda sustitución",
        "replaceAction": "Asignar sustituto",
        "replaceTitle": "Asignar sustituto al turno",
        "replaceFor": "Sitio:",
        "replaceWindow": "Horario:",
        "noAvailable": "No hay trabajadores disponibles para este horario (todos en conflicto)",
        "freeAllDay": "Libre todo el día",
        "sameDayShifts": "Sus turnos hoy",
        "reason": "Motivo (opcional — se registra en la auditoría)",
        "reasonPlaceholder": "Ej.: ausencia no comunicada",
        "confirmReplace": "Confirmar sustitución",
        "replaced": "Sustituto asignado y avisado al instante",
        "conflictRejected": "Rechazado: el sustituto tiene un turno en conflicto",
        "availableLoadError": "No se pudieron cargar los trabajadores disponibles",
        "replaceError": "No se pudo asignar el sustituto",
    },
}

NOTIFICATIONS = {
    "ar": {
        "title": "الإشعارات",
        "empty": "لا إشعارات بعد",
        "markAllRead": "تعليم الكل كمقروء",
        "enablePush": "تفعيل إشعارات المتصفح",
        "replaceLine1": "أُسندت إليك وردية تغطية في",
        "replaceLine2": "بتاريخ",
        "replaceFrom": "من",
        "replaceTo": "إلى",
        "replaceInsteadOf": "بدلًا من",
        "unknownType": "إشعار جديد",
    },
    "fr": {
        "title": "Notifications",
        "empty": "Aucune notification pour l'instant",
        "markAllRead": "Tout marquer comme lu",
        "enablePush": "Activer les notifications du navigateur",
        "replaceLine1": "Un poste de remplacement vous est assigné sur",
        "replaceLine2": "le",
        "replaceFrom": "de",
        "replaceTo": "à",
        "replaceInsteadOf": "à la place de",
        "unknownType": "Nouvelle notification",
    },
    "en": {
        "title": "Notifications",
        "empty": "No notifications yet",
        "markAllRead": "Mark all as read",
        "enablePush": "Enable browser notifications",
        "replaceLine1": "A coverage shift has been assigned to you at",
        "replaceLine2": "on",
        "replaceFrom": "from",
        "replaceTo": "to",
        "replaceInsteadOf": "instead of",
        "unknownType": "New notification",
    },
    "es": {
        "title": "Notificaciones",
        "empty": "Aún no hay notificaciones",
        "markAllRead": "Marcar todo como leído",
        "enablePush": "Activar notificaciones del navegador",
        "replaceLine1": "Se le ha asignado un turno de cobertura en",
        "replaceLine2": "el",
        "replaceFrom": "de",
        "replaceTo": "a",
        "replaceInsteadOf": "en lugar de",
        "unknownType": "Nueva notificación",
    },
}

for lang in ["ar", "fr", "en", "es"]:
    path = f"{BASE}{lang}.json"
    with open(path, encoding="utf-8") as f:
        d = json.load(f)

    # dashboard.coverage
    d["dashboard"]["coverage"] = DASH[lang]["coverage"]
    # shifts.sourceReplacement
    d["shifts"]["sourceReplacement"] = SHIFT_SRC[lang]
    # phaseNoteBody → 0.5.0
    d["dashboard"]["phaseNoteBody"] = PHASE_NOTE[lang]
    # sections جديدة
    d["coverage"] = COVERAGE[lang]
    d["notifications"] = NOTIFICATIONS[lang]

    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"✓ {lang}: coverage({len(COVERAGE[lang])}) + notifications({len(NOTIFICATIONS[lang])}) + dashboard/shifts")

print("تمت الإضافة للغات الأربع")

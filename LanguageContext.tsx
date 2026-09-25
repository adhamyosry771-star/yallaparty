import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (arText: string, enFallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const spanishDictionary: Record<string, string> = {};
const dummySpanishDictionary: Record<string, string> = {
  // Arabic keys to Spanish
  "الرئيسية": "Inicio",
  "أخبار": "Noticias",
  "الرسائل": "Mensajes",
  "أنا": "Yo",
  "الملف الشخصي": "Perfil",
  "رسائل": "Mensajes",
  "يلا بارتي": "Yalla Party",
  "عالم الترفيه والدردشة": "Mundo de entretenimiento y chat de voz",
  "تسجيل الدخول": "Iniciar sesión",
  "البريد الإلكتروني": "Correo electrónico",
  "كلمة المرور": "Contraseña",
  "اسم المستخدم": "Nombre de usuario",
  "إنشاء حساب جديد": "Crear nueva cuenta",
  "ليس لديك حساب؟": "¿No tienes una cuenta?",
  "لديك حساب بالفعل؟": "¿Ya tienes una cuenta?",
  "أكمل البيانات": "Por favor complete todos los detalles",
  "تم تسجيل الدخول بنجاح": "Sesión iniciada con éxito",
  "رمز المضيف": "Código exclusivo del anfitrión",
  "مغادرة": "Salir",
  "حفظ": "Guardar",
  "تعديل": "Editar",
  "حذف": "Eliminar",
  "إلغاء": "Cancelar",
  "إغلاق": "Cerrar",
  "حفظ التغييرات": "Guardar cambios",
  "تم الحفظ": "Guardado exitosamente",
  "تحميل...": "Cargando...",
  "تأكيد": "Confirmar",
  "عرض": "Ver",
  "إرسال": "Enviar",
  "موافق": "Aceptar",
  "بحث...": "Buscar...",
  "تنبيه": "Advertencia",
  "ممنوع": "Prohibido",
  "تعديل البيانات": "Editar datos",
  "يوم": "día",
  "أيام": "días",
  "لوحة التحكم": "Panel de control",
  "إدارة المستخدمين": "Gestión de usuarios",
  "إدارة الغرف": "Gestión de salas",
  "خلفيات مجانية": "Fondos gratuitos",
  "المتجر": "Tienda",
  "إيموجي": "Emojis",
  "الهدايا": "Regalos",
  "لعبة فواكه": "Juego de Frutas",
  "لعبة الفواكه": "Juego de Frutas",
  "الصور الرئيسية": "Imágenes principales",
  "تصميم الوكالات": "Diseño de agencias",
  "استلام البلاغات": "Reportes recibidos",
  "إعدادات الحساب": "Configuración de cuenta",
  "تغيير بريد الحساب": "Cambiar correo de cuenta",
  "تحديث البريد الإلكتروني الخاص بدخولك": "Actualizar correo de inicio de sesión",
  "تغيير كلمة المرور": "Cambiar contraseña",
  "تحديث مفتاح الأمان الخاص بحسابك": "Actualizar contraseña de seguridad de cuenta",
  "الدعم الفني": "Soporte técnico",
  "تواصل معنا للمساعدة والاستفسارات": "Contáctenos para ayuda y consultas",
  "لغة التطبيق": "Idioma de aplicación",
  "اللغة": "Idioma",
  "العربية": "العربية (Árabe)",
  "الإنجليزية": "English (Inglés)",
  "الصينية المبسطة": "简体中文 (Chino)",
  "الإسبانية": "Español (Español)",
  "أدخل كلمة المرور الجديدة...": "Introduzca nueva contraseña...",
  "كلمة المرور الحالية": "Contraseña actual",
  "متجر يلا بارتي": "Tienda oficial de Yalla Party",
  "مجوهرات": "Diamantes",
  "عملات": "Monedas",
  "ذهبية": "Monedas de oro",
  "شراء": "Comprar",
  "سعر": "Precio",
  "محفظتي": "Mi billetera",
  "رصيد": "Saldo de monedas",
  "ذهبي": "Oro",
  "مستوى": "Nivel",
  "متجر الإيموجي": "Tienda de emojis",
  "متجر الهدايا": "Tienda de regalos de lujo",
  "تصميم المتجر": "Diseño de tienda",
  "تفاصيل الحساب": "Detalles de cuenta",
  "الحالة": "Estado",
  "أصدقاء": "Amigos center",
  "متابعين": "Seguidores",
  "متابعة": "Seguir",
  "أتابع": "Siguiendo",
  "طلب متابعة": "Solicitud de seguimiento",
  "رسالة": "Mensaje",
  "هدية": "Regalo",
  "العضو": "Miembro",
  "شريك": "Pareja CP",
  "لا يوجد": "Ninguno",
  "الأوسمة والجوائز": "Medallas de honor",
  "لا توجد شارات حالياً": "Actualmente no hay medallas",
  "لا يوجد أحد على المايك": "Nadie en el micrófono",
  "تحديد": "Filtrar",
  "كل الغرفة": "Toda la sala",
  "كل المايك": "Todos los micrófonos",
  "عادية": "Regalo normal",
  "محظوظة": "Regalo de la suerte",
  "مشاهير": "Exclusivo de celebridades",
  "دولة": "Edición especial de país",
  "ميلاد": "Cumpleaños feliz",
  "لا يوجد شيء هنا": "No hay nada aquí",
  "اختر الكمية": "Seleccione cantidad",
  "مغادرة المايك": "Dejar el micrófono",
  "عرض البيانات": "Ver perfil completo",
  "أخذ المايك": "Subir al micrófono",
  "فتح المايك": "Activar micrófono",
  "قفل المايك": "Bloquear micrófono",
  "منشن": "Mencionar @miembro",
  "إدارة العضو": "Gestión de miembros",
  "طرد من المايك": "Quitar del micrófono",
  "كتم المايك": "Silenciar micrófono",
  "إصمات من الغرفة": "Silenciar en sala",
  "طرد من الغرفة": "Expulsar de la sala",
  "جاري تحميل الملف الشخصي...": "Cargando perfil...",
  "فشل فتح المحادثة": "No se pudo abrir el chat",
  "إعدادات قفل الغرفة": "Configuración de bloqueo de sala",
  "كلمة مرور الغرفة (6 أرقام)": "Contraseña de la sala (6 dígitos)",
  "اترك الحقل فارغاً إذا كنت تريد فتح الغرفة للجميع": "Dejar en blanco para abrir a todos",
  "قفل الغرفة الآن": "Bloquear sala ahora",
  "فتح الغرفة للجميع": "Permitir entrada a todos",
  "احتفاظ": "Mantener",
  "خروج": "Salir",
  "المتواجدون": "Usuarios en línea",
  "تحكم المايك": "Control de micrófono",
  "سبب البلاغ": "Razón de reporte",
  "اباحي": "Contenido para adultos",
  "اسائة": "Abuso",
  "شتائم": "Insultos",
  "ترويج": "Promoción",
  "يرجى شرح ما حدث بالتفاصيل": "Por favor explique en detalle",
  "اكتب هنا...": "Escribe aquí...",
  "تقديم البلاغ": "Enviar reporte",
  "تم تقديم البلاغ": "Reporte enviado",
  "سيتم المراجعه شكرا لك على الحفاظ على بيئة Yalla Party": "Se revisará, gracias por mantener un ambiente seguro en Yalla Party",
  "حسناً": "Entendido",
  "نظام شحن الوكالات": "Sistema de carga de agencia",
  "دخول الغرفة": "Entrar a la sala",
  "تسجيل خروج": "Cerrar sesión",
  "تم تحديث صورتك": "Su foto ha sido actualizada",
  "بروفايلك": "Tu perfil",
  "مستخدم": "Usuario",
  "وقت": "Tiempo",
  "التاريخ": "Fecha",
  "عدد": "Cantidad",
  "الملف": "Archivo",
  "رصيد الوكالة": "Saldo de agencia",
  "الحظر": "Baneo de cuenta",
  "الأعضاء": "Miembros",
  "أرسل إشعار": "Enviar notificación center",
  "تنبيه رسمي": "Notificación oficial",
  "مستوى المستخدم": "Nivel de usuario",
  "شحن إداري": "Carga administrativa",
  "سحب عملات": "Retirar monedas",
  "منح الأوسمة": "Otorgar medallas",
  "منح عناصر": "Otorgar artículos de tienda",
  "تغيير الـ ID المتميز": "Personalizar ID especial",
  "تفعيل/إلغاء نظام الحظر": "Activar/Desactivar baneo",
  "تفعيل/إلغاء نظام المدير العام": "Activar/Desactivar GM",
  "تفاصيل الحظر": "Detalles de bloqueos",
  "لا توجد طلبات معلقة": "No hay solicitudes pendientes",
  "يريد متابعتك": "Quiere seguirte",
  "لوحة المسؤول": "Panel de administración",
  "المستخدمين": "Usuarios",
  "محادثات الدعم": "Conversaciones de soporte",
  "الغرف": "Salas center",
  "الأخبار": "Novedades oficiales",
  "البنرات": "Banners de eventos",
  "مرحباً بالسيد المدير": "Bienvenido, Administrador",
  "لديك كامل الصلاحيات لإدارة المحتوى والمستخدمين.": "Tiene privilegios completos para administrar salas y usuarios",
  "إدارة العضوية": "Gestión de membresías",
  "إدارة الوكلاء": "Gestión de agentes autorizados",
  "شحن": "Carga",
  "خصم": "Descuento",
  "تعديل الـ ID المتميز": "Editar ID premium",
  "منح إطار وبادج وعناصر متميزة": "Otorgar marcos, insignias y artículos de lujo",
  "المستخدمين المعلقين": "Usuarios suspendidos",
  "إدارة البنرات": "Gestión de banners",
  "نظام المدير العام": "Sistema de gerente general",
  "إدارة البنرات المتحركه": "Gestión de banners animados",
  "إدارة البنرات المتحركة": "Gestión de banners animados",
  "رفع صور بنرات جديدة لواجهة التطبيق": "Subir nuevos banners para la app",
  "إجراءات الحظر وفك الحظر": "Procedimientos de bloqueo y desbloqueo",
  "سجلات عمليات الإدارة": "Registros de operaciones administrativas",
  "إعطاء عناصر المتجر": "Enviar artículos de tienda",
  "إدارة وحذف الغرف": "Gestionar y eliminar salas",
  "تحذير أصحاب الغرف أو حذفها نهائياً": "Advertir a dueños de salas o eliminarlas",
  "استلام بلاغات الغرف": "Reportes de salas",
  "مراجعة البلاغات المقدمة ضد الغرف": "Revisar reportes contra salas",
  "إعدادات صفحة الـ CP": "Configurar la página de CP",

  // English keys to Spanish
  "Home": "Inicio",
  "News": "Noticias",
  "Messages": "Mensajes",
  "Me": "Yo",
  "Profile": "Perfil",
  "Admin Panel": "Panel de administración",
  "The World of Entertainment and Voice Chat": "El mundo del entretenimiento y chat de voz",
  "Login": "Iniciar sesión",
  "Email Address": "Correo electrónico",
  "Password": "Contraseña",
  "Username": "Nombre de usuario",
  "Register New Account": "Crear nueva cuenta",
  "Don't have an account?": "¿No tienes una cuenta?",
  "Already have an account?": "¿Ya tienes una cuenta?",
  "Please fill in all details": "Por favor complete todos los detalles",
  "Logged in successfully": "Sesión iniciada con éxito",
  "Host Code": "Código del anfitrión",
  "Leave": "Salir",
  "Save": "Guardar",
  "Edit": "Editar",
  "Delete": "Eliminar",
  "Cancel": "Cancelar",
  "Close": "Cerrar",
  "Save Changes": "Guardar cambios",
  "Saved successfully": "Guardado exitosamente",
  "Loading...": "Cargando...",
  "Confirm": "Confirmar",
  "View": "Ver",
  "Send": "Enviar",
  "OK": "Aceptar",
  "Okay": "Aceptar",
  "Search...": "Buscar...",
  "Notification": "Notificación",
  "Edit Profile": "Editar perfil",
  "day": "día",
  "days": "días",
  "Control Panel": "Panel de control",
  "User Management": "Gestión de usuarios",
  "Room Management": "Gestión de salas",
  "Free Backgrounds": "Fondos gratuitos",
  "Store": "Tienda",
  "Emojis": "Emojis",
  "Gifts": "Regalos",
  "Fruits Game": "Juego de Frutas",
  "Main Images": "Imágenes principales",
  "Agency Design": "Diseño de agencia",
  "Reports Received": "Reportes recibidos",
  "Account Settings": "Configuración de cuenta",
  "Change Account Email": "Cambiar correo de cuenta",
  "Update your sign-in email address": "Actualizar su correo de inicio de sesión",
  "Update your account security key": "Actualizar clave de seguridad de cuenta",
  "Technical Support": "Soporte técnico",
  "Contact us for help and inquiries": "Contáctenos para ayuda e inquietudes",
  "App Language": "Idioma de aplicación",
  "Language": "Idioma",
  "Arabic (العربية)": "Árabe (العربية)",
  "English": "English (Inglés)",
  "Enter new password...": "Introduzca nueva contraseña...",
  "Current Password": "Contraseña actual",
  "Yalla Party Store": "Tienda Yalla Party",
  "Diamonds": "Diamantes",
  "Coins": "Monedas",
  "Gold": "Monedas de oro",
  "Buy": "Comprar",
  "Price": "Precio",
  "My Wallet": "Mi billetera",
  "Balance": "Saldo de monedas",
  "Level": "Nivel",
  "Emoji Store": "Tienda de emojis",
  "Gift Store": "Tienda de regalos",
  "Store Design": "Diseño de tienda",
  "Account Details": "Detalles de cuenta",
  "Status": "Estado",
  "Friends": "Amigos",
  "Followers": "Seguidores",
  "Following": "Siguiendo Centre",
  "Follow Request": "Solicitud de seguimiento",
  "Message": "Mensaje",
  "Gift": "Regalo",
  "Member": "Miembro",
  "Partner": "CP Pareja",
  "None": "Ninguno",
  "Badges & Medals": "Medallas e insignias",
  "No badges currently available": "No hay insignias disponibles",
  "No one is on mic": "Nadie en el micrófono",
  "Select": "Seleccionar",
  "All Room": "Toda la sala",
  "All Mics": "Todos los micrófonos",
  "Normal": "Normal",
  "CP": "CP Pareja",
  "Famous": "Famosos",
  "Country": "Edición País",
  "VIP": "VIP",
  "Birthday": "Cumpleaños Centennial",
  "Nothing here": "Nada aquí",
  "Select Quantity": "Seleccione cantidad",
  "Leave Mic": "Dejar micrófono",
  "View Profile": "Ver perfil",
  "Take Mic": "Subir al micrófono",
  "Unlock Mic": "Desbloquear micrófono",
  "Lock Mic": "Bloquear micrófono",
  "Mention": "Mencionar",
  "Manage Member": "Gestionar miembro",
  "Kick from Mic": "Quitar del micrófono",
  "Mute Mic": "Silenciar micrófono",
  "Silence in Room": "Silenciar en sala",
  "Kick from Room": "Expulsar de sala",
  "Loading profile...": "Cargando perfil...",
  "Failed to open chat": "Error al abrir chat",
  "Room Lock Settings": "Diseño de bloqueo de sala",
  "Room Password (6 Digits)": "Contraseña de la sala (6 dígitos)",
  "Leave empty to open the room to everyone": "Dejar vacío para abrir a todos",
  "Lock Room Now": "Bloquear sala ahora",
  "Open to All": "Abierto a todos",
  "Open Room to All": "Abrir sala a todos",
  "Keep": "Mantener",
  "Exit": "Salir",
  "Online": "En línea",
  "Mic Control": "Control de micrófono",
  "Report Reason": "Razón de reporte",
  "Pornographic": "Pornográfico",
  "Abuse": "Abuso",
  "Slander": "Difamación",
  "Promotion": "Promoción",
  "Please explain in detail what happened": "Por favor explique en detalle qué sucedió",
  "Write here...": "Escribe aquí...",
  "Submit Report": "Enviar reporte",
  "Report Submitted": "Reporte enviado",
  "It will be reviewed. Thank you for keeping Yalla Party a safe community!": "Será revisado. ¡Gracias por mantener a Yalla Party como una comunidad segura!",
  "Logout of Account": "Cerrar sesión de la cuenta",
  "Changing language will dynamically convert the entire application interface and layout directions.": "Cambiar el idioma convertirá dinámicamente toda la interfaz.",
  "Create Room": "Crear sala",
  "Room Name": "Nombre de la sala",
  "Enter Room Name": "Ingrese nombre de la sala...",
  "Room Category": "Categoría de sala",
  "Create Room Now": "Crear sala ahora",
  "Join": "Entrar",
  "Enter Room ID": "Ingrese ID de la sala...",
  "Join Room": "Unirse a la sala",
  "Private Chat": "Chat privado",
  "Send a message...": "Enviar un mensaje...",
  "Admin Control Panel": "Panel de control principal",
  "User Ban System": "Sistema de baneo de usuarios",
  "Official Notification": "Anuncio oficial",
  "No pending requests": "No hay solicitudes pendientes",
  "wants to follow you": "quiere seguirte",
  "Banned Devices": "Dispositivos baneados",
  "Agency Wallet": "Billetera de agencia",
  "Agency Management": "Gestión de agencias",
  "Manage": "Gestionar",
  "User Info": "Información de usuario",
  "Ban Device": "Banear dispositivo",
  "Unban Device": "Desbanear dispositivo",
  "Ban User": "Banear usuario",
  "Unban User": "Desbanear usuario",
  "Add Item": "Agregar artículo",
  "Give Diamonds": "Entregar diamantes",
  "Give Coins": "Entregar monedas",
  "Send Notification": "Enviar advertencia",
  "Default Images": "Imágenes oficiales",
  "Set Design": "Diseño de tema",
  "Reports": "Buzón de reportes",
  "Accept": "Aceptar",
  "Reject": "Rechazar",
  "Simplified Chinese": "简体中文 (Chino)",
  "Apps Language": "Idioma de la aplicación",
  "Logout": "Cerrar sesión",
  "Spanish (Español)": "Español (Spanish)",

  // Additional rich dictionary keys (Arabic & English keys to Spanish)
  "شحن كوينز": "Cargar monedas",
  "خصم كوينز": "Descontar monedas",
  "الكمية...": "Cantidad...",
  "المبلغ...": "Cantidad...",
  "الرسائل الرسمية": "Mensajes oficiales",
  "حذف الغرفة": "Eliminar sala",
  "طرد المايك": "Quitar de micrófono",
  "كتم المايك": "Silenciar micrófono",
  "إصمات": "Silenciar en sala",
  "طرد": "Expulsar",
  "تسجيل الخروج من الحساب": "Cerrar sesión segura",
  "حظر جهاز": "Banear dispositivo",
  "إلغاء حظر جهاز": "Desbanear dispositivo",
  "حظر مستخدم": "Banear usuario",
  "إلغاء حظر مستخدم": "Desbanear usuario",
  "منح الآي دي": "Asignar ID especial",
  "الآي دي الحالي": "ID actual",
  "عدد الأيام": "Duración en días",
  "عضو": "Miembro",
  "مشرف": "Administrador",
  "مالك": "Anfitrión",
  "طلب ارتباط": "Solicitud de CP",
  "الأصدقاء": "Amigos",
  "إعدادات الغرفة": "Configuración de sala",
  "تغيير الخلفية": "Cambiar fondo",
  "خلفيات المتجر": "Fondos de tienda",
  "إطارات المتجر": "Marcos de tienda",
  "دخوليات المتجر": "Efectos de entrada",
  "دخول الأبطال": "Entrada de héroes",
  "تفاح": "🍎 Manzana",
  "برتقال": "🍊 Naranja",
  "ليمون": "🍋 Limón",
  "خوخ": "🍑 Melocotón",
  "فراولة": "🍓 Fresa",
  "مانجو": "🥭 Mango",
  "بطيخ": "🍉 Sandía",
  "كرز": "🍒 Cereza",
  "فترة الرهان": "Periodo de apuestas",
  "ثانية": "segundos",
  "جاري تحديد الفائز...": "Sorteando ganador...",
  "هو الرابح!": "¡es el ganador!",
  "مبارك! ربحت ": "¡Felicitaciones! Ganó ",
  "اختر مبلغ الرهان": "Establecer cantidad de apuesta",
  "المراهنة: ": "Apuesta total: ",
  "النتائج السابقة": "Resultados anteriores",
  "بانتظار الجولة الأولى...": "Esperando el inicio del juego...",
  "وكالة الشحن": "Agencia de carga autorizada",
  "سجل العمليات": "Historial de operaciones",
  "سجلات الحظر": "Historial de bloqueos",
  "إعطاء عناصر المتجر": "Obsequiar artículos",
  "اختر المستخدم": "Seleccionar usuario",
  "ابحث بالاسم أو ID...": "Buscar por nombre o ID...",
  "تغيير": "Cambiar",
  "اختر العنصر": "Seleccionar artículo",
  "إطارات": "Marcos",
  "دخوليات": "Entradas",
  "خلفيات": "Fondos",
  "المدة بالأيام": "Duración en días",
  "منح العنصر الآن": "Otorgar artículo ahora",
  "تم المنح بنجاح!": "¡Otorgado con éxito!",
  "مساعد وكالة": "Asistente de agencia",
  "محفظة الوكالة": "Billetera de agencia",
  "شحن وكالة": "Cargar billetera de agencia",
  "تفاصيل العمليات": "Historial de transacciones de agencia",
  "طلب ارتباط (CP)": "Solicitud de relación de pareja (CP)",
  "تصميم وتعديل الـ ID المخصص": "Personalizar ID de usuario",
  "معاينة البروفايل (90 × 28)": "Vista previa de tarjeta (90 x 28)",
  "أيقونة زر الهدايا": "Icono de botón de regalos",
  "اختر الأيقونة": "Seleccionar icono",
  "أو ضع رابط الأيقونة هنا": "O pegue la URL aquí",
  "سحب الرصيد": "Retirar saldo",
  "تعديل وتصميم الـ ID المتميز": "Personalizar ID premium",
  "العنوان": "Título",
  "التفاصيل": "Detalles",
  "البريد": "Correo",
  "تغيير البريد الإلكتروني": "Cambiar correo",
  "تغيير البريد": "Cambiar correo",
  "تغيير الباسورد": "Cambiar contraseña",
  "أخبرنا بالمشكلة": "Cuéntenos su problema...",
  "يرجى توضيح المشكلة": "Por favor explique el problema",
  "إرسال رسالة للدعم": "Enviar mensaje de soporte",
  "هل تريد طرد": "¿Seguro que desea expulsar?",
  "فشل": "Error / Operación fallida",
  "تم": "Completado con éxito",
  "إضافة عنصر": "Agregar artículo de tienda",
  "اسم الصنف": "Nombre de artículo",
  "سعر العنصر": "Precio de artículo",
  "مدة الصلاحية": "Validez (días)",
  "أيقونة العنصر": "URL del icono o marco",
  "تحميل الصورة": "Cargar imagen",
  "دخولية الملك": "Entrada real del rey",
  "تنين اللورد": "Entrada de dragón señor",
  "سيارة رياضية": "Coche deportivo de entrada",
  "برق ورعد": "Trueno y relámpago",
  "خلفية ديسكو": "Fondo de fiesta disco",
  "خلفية هادئة": "Fondo relajante",
  "إطار ملكي": "Marco real de corona",
  "إطار الورد": "Marco de rosas",
  "خلفية الفضاء": "Fondo espacial elegante",
  "سيستم الحظر نشط": "Sistema de baneo activo",
  "بدون نظام حظر": "Baneo desactivado",
  "نظام المدير نشط": "Sistema GM activo",
  "بدون نظام مدير": "GM desactivado",
  "كلمة المرور:": "Contraseña:",
  "غير متوفرة بعد": "No disponible aún",

  // Room Alerts & Dialogs
  "لقد تم طردك من هذه الغرفة": "Usted ha sido expulsado o baneado de la sala.",
  "لقد تم كتمك من الكتابة والدردشة في هذه الغرفة": "Se le ha silenciado el chat en esta sala.",
  "يرجى اختيار هدية أولاً": "Por favor seleccione un regalo primero",
  "يريد متابعتك": "quiere seguirte",
  "لا يمكنك طرد هذا المستخدم": "No puedes expulsar a este usuario",
  "تنبيه رسمي": "Aviso Oficial"
};

const spanishItemNames: Record<string, string> = {
  "إطار النجوم": "Marco Estelar",
  "إطار ذهبي": "Marco de Oro",
  "تنين اللورد": "Entrada de Dragón Señor",
  "سيارة رياضية": "Coche Deportivo",
  "برق ورعد": "Efectos Eléctricos",
  "خلفية ديسكو": "Fondo Disco",
  "خلفية هادئة": "Fondo Relajante",
  "إطار ملكي": "Marco Corona Real",
  "إطار الورد": "Marco de Rosas",
  "دخول الأبطال": "Entrada de Héroes",
  "دخولية الملك": "Entrada Real del Rey",
  "خلفية الفضاء": "Fondo Cósmico Cósmico"
};

const translateItemNameEs = (name: string): string => {
  return spanishItemNames[name.trim()] || name;
};

export const translateEnToEs = (enText: string): string => {
  return enText;
};

const dummyTranslateEnToEs = (enText: string): string => {
  if (!enText) return enText;
  let text = enText.trim();

  if (spanishDictionary[text]) {
    return spanishDictionary[text];
  }

  const rules = [
    {
      regex: /Congratulations!\s+You\s+received\s+a\s+premium\s+(frame|room entry|room background|item)\s*\((.*?)\)\s*for\s*(\d+)\s*days\.\s*Check\s*it\s*now\s*in\s*your\s*Bag\s*in\s*the\s*Store\./i,
      replace: (_: string, type: string, name: string, days: string) => {
        const typeEs: Record<string, string> = { "frame": "marco de fotos", "room entry": "efecto de entrada de sala", "room background": "fondo de sala premium", "item": "artículo en inventario" };
        const nameEs = translateItemNameEs(name);
        return `¡Felicitaciones! Has recibido un ${typeEs[type] || 'artículo'} premium (${nameEs}) por ${days} días. ¡Compruébalo ahora en tu Mochila en la Tienda!`;
      }
    },
    {
      regex: /Congratulations!\s+You\s+received\s+([\d,]+)\s+coins\s+from\s+the\s+bar\s+wealth\s+of\s*"(.*?)"\./i,
      replace: (_: string, coins: string, owner: string) => {
        return `¡Felicitaciones! Recibió ${coins} monedas de la barra de fortuna de "${owner}".`;
      }
    },
    {
      regex: /The\s+Administration\s+has\s+granted\s+you\s+a\s+special\s+frame\s+named\s*"(.*?)"\s*for\s*(\d+)\s*days\.\s*Check\s*it\s*now\s*in\s*your\s*store\s*settings!/i,
      replace: (_: string, name: string, days: string) => {
        return `La Administración le ha otorgado un marco de perfil especial llamado "${translateItemNameEs(name)}" por ${days} días. ¡Pruébelo ahora mismo en la configuración de la tienda!`;
      }
    },
    {
      regex: /The\s+Administration\s+has\s+granted\s+you\s+a\s+custom\s+room\s+theme\/background\s+named\s*"(.*?)"\s*for\s*(\d+)\s*days\.\s*Check\s*it\s*now\s*in\s*your\s*voice\s*room\s*settings!/i,
      replace: (_: string, name: string, days: string) => {
        return `La Administración le ha otorgado un fondo de sala personalizado llamado "${translateItemNameEs(name)}" por ${days} días. ¡Pruébelo ahora en la configuración de su sala de voz!`;
      }
    },
    {
      regex: /The\s+Administration\s+has\s+granted\s+your\s+profile\s+an\s+awesome\s+animated\s+profile\s+photo!\s+Enjoy\s+your\s+new\s+custom\s+look\./i,
      replace: () => "¡La Administración le ha otorgado a su perfil una increíble foto animada! Disfrute de su nuevo diseño."
    },
    {
      regex: /The\s+Administration\s+has\s+gifted\s+your\s+room\s*"(.*?)"\s*an\s+exclusive\s+premium\s+animated\s+cover\s+logo\.\s*See\s*your\s*channel's\s*fresh\s*style\s*now!/i,
      replace: (_: string, titleName: string) => {
        return `La Administración le ha regalado a su sala "${titleName}" un exclusivo diseño de logo animado para la portada. ¡Vea el nuevo aspecto ahora!`;
      }
    },
    {
      regex: /([\d,]+)\s+Gold\s+Coins\s+have\s+been\s+recharged\s+to\s+your\s+account\s+by\s+the\s+Administration\.\s*Enjoy!/i,
      replace: (_: string, amount: string) => {
        return `La Administración ha cargado con éxito ${amount} monedas de oro a su cuenta. ¡Que las disfrute mucho!`;
      }
    },
    {
      regex: /([\d,]+)\s+Gold\s+Coins\s+have\s+been\s+debited\s+from\s+your\s+account\s+by\s+the\s+Administration\./i,
      replace: (_: string, amount: string) => {
        return `La Администрация ha debitado con éxito ${amount} monedas de oro de su cuenta.`;
      }
    },
    {
      regex: /Congratulations!\s+You\s+received\s+an\s+exclusive\s+unique\s+ID\s+from\s+the\s+Administration\.\s+Your\s+new\s+ID\s+is:\s*(\w+)/i,
      replace: (_: string, newId: string) => {
        return `¡Felicitaciones! Recibió un ID único VIP especial de la Administración: ${newId}.`;
      }
    },
    {
      regex: /You\s+have\s+been\s+authorized\s+to\s+use\s+the\s+User\s+Ban\s+System\.\s+Access\s+privileges\s+are\s+active;\s+find\s+it\s+in\s+your\s+profile\s+menu\s+now\./i,
      replace: () => "Se le ha otorgado autorización para usar el Sistema de Baneo. Acceda ahora en su menú de perfil."
    },
    {
      regex: /The\s+User\s+Ban\s+System\s+access\s+was\s+revoked\s+from\s+your\s+account\s+due\s+to\s+rules\s+violations\./i,
      replace: () => "Su acceso al Sistema de Baneo ha sido revocado debido a violaciones de las normas de la comunidad."
    },
    {
      regex: /Congratulations!\s+You\s+have\s+been\s+granted\s+full\s+permissions\s+for\s+the\s+General\s+Manager\s+Panel\.\s+Open\s+your\s+profile\s+menu\s+to\s+configure\s+and\s+manage\./i,
      replace: () => "¡Enhorabuena! Bienvenido, se le han concedido permisos completos para acceder al Panel GM. Abra su perfil para gestionarlo."
    },
    {
      regex: /Access\s+to\s+the\s+General\s+Manager\s+Panel\s+has\s+been\s+revoked\s+from\s+this\s+account\s+due\s+to\s+guideline\s+violations\./i,
      replace: () => "El acceso al Panel GM ha sido retirado debido a infracciones graves de las pautas."
    },
    {
      regex: /Warning:\s+We\s+have\s+received\s+multiple\s+reports\s+against\s+your\s+voice\s+room\s+recently\.\s+Please\s+adhere\s+strictly\s+to\s+user\s+safety\s+guidelines,\s+otherwise\s+your\s+account\s+may\s+be\s+banned\s+and\s+your\s+room\s+suspended\.\s+We\s+hope\s+you\s+enjoy\s+your\s+special\s+highlights\s+here\./i,
      replace: () => "Advertencia: Recibimos múltiples reportes de infracciones en su sala de voz recientemente. Respete estrictamente las pautas para evitar suspensión."
    },
    {
      regex: /Congratulations!\s+You\s+received\s+the\s+user\s+shipping\s+panel\s+and\s+became\s+an\s+authorized\s+agent\s+with\s+a\s+welcome\s+balance\s+of\s+([\d,]+)\s+Gold\./i,
      replace: (_: string, coins: string) => {
        return `¡Felicitaciones! Ha sido acreditado oficialmente como Agente Autorizado de Carga de Monedas con saldo inicial de bienvenida de ${coins} de Oro.`;
      }
    },
    {
      regex: /We\s+regret\s+to\s+inform\s+you\s+that\s+the\s+Shipping\s+Agency\s+credentials\s+have\s+been\s+revoked\s+from\s+your\s+official\s+account\./i,
      replace: () => "Lamentamos informarle que sus privilegios de Agencia Autorizada de Carga han sido revocados de su cuenta."
    },
    {
      regex: /A\s+balance\s+of\s+([\d,]+)\s+credits\s+was\s+added\s+to\s+your\s+Shipping\s+Agency\s+wallet\s+by\s+the\s+Administration\./i,
      replace: (_: string, amount: string) => {
        return `La administración ha añadido un saldo de ${amount} créditos a su billetera de Agente de Carga.`;
      }
    },
    {
      regex: /A\s+balance\s+of\s+([\d,]+)\s+credits\s+was\s+deduced\s+from\s+your\s+Shipping\s+Agency\s+wallet\s+by\s+the\s+Administration\./i,
      replace: (_: string, amount: string) => {
        return `La administración ha descontado un saldo de ${amount} créditos de su billetera de Agente de Carga.`;
      }
    },
    {
      regex: /(.*?)\s+proposed\s+to\s+pair\s+\/\s+bond\s+CP\s+relationship\s+with\s+you\./i,
      replace: (_: string, name: string) => `¡${name} te ha enviado una solicitud romántica para emparejarse y establecer una relación de novios CP!`
    },
    {
      regex: /The\s+other\s+partner\s+dissolved\s+the\s+CP\s+link\s+and\s+compensated\s+you\s+with\s+([\d,]+)\s+Gold\s+Coins\./i,
      replace: (_: string, amount: string) => `Aviso de relación: Tu pareja rescindió el vínculo CP y te compensó con ${amount} monedas.`
    },
    {
      regex: /Congratulations!\s+You\s+have\s+successfully\s+recharged\s+([\d,]+)\s+Coins\s+from\s+Shipping\s+Agent\s+\((.*?)\)\s*\(ID_(\w+)\)/i,
      replace: (_: string, coins: string, name: string, id: string) => {
        return `Carga recibida: Carga exitosa de ${coins} Oro mediante el Agente Oficial de Carga ${name} (ID: ${id}). ¡Gracias!`;
      }
    }
  ];

  for (const item of rules) {
    if (item.regex.test(text)) {
      return text.replace(item.regex, item.replace as any);
    }
  }

  return text
    .replace(/\bCongratulations\b/gi, "¡Felicidades!")
    .replace(/\bloading\b/gi, "cargando")
    .replace(/\berror\b/gi, "error")
    .replace(/\bRoom\b/gi, "Sala")
    .replace(/\bUser\b/gi, "Usuario")
    .replace(/\bBanned\b/gi, "Baneado")
    .replace(/\bJoined\b/gi, "Unido")
    .replace(/\bRecharged\b/gi, "Cargado")
    .replace(/\bsuccessfully\b/gi, "correctamente")
    .replace(/\bfailed\b/gi, "fallido");
};

// A core dictionary for Simplified Chinese translations (covers both Arabic keys and English fallbacks/terms)
export const chineseDictionary: Record<string, string> = {
  // Arabic keys to Chinese
  "الرئيسية": "首页",
  "أخبار": "新闻",
  "الرسائل": "消息",
  "أنا": "我的",
  "الملف الشخصي": "个人资料",
  "رسائل": "消息",
  "يلا بارتي": "Yalla Party",
  "عالم الترفيه والدردشة": "娱乐与语音群聊世界",
  "تسجيل الدخول": "登录",
  "البريد الإلكتروني": "邮箱地址",
  "كلمة المرور": "密码",
  "اسم المستخدم": "用户名",
  "إنشاء حساب جديد": "注册新账号",
  "ليس لديك حساب؟": "没有账号？",
  "لديك حساب بالفعل؟": "已有账号？",
  "أكمل البيانات": "请填写所有详细信息",
  "تم تسجيل الدخول بنجاح": "登录成功",
  "رمز المضيف": "房主专属代码",
  "مغادرة": "离开",
  "حفظ": "保存",
  "تعديل": "编辑",
  "حذف": "删除",
  "إلغاء": "取消",
  "إغلاق": "关闭",
  "حفظ التغييرات": "保存修改",
  "تم الحفظ": "保存成功",
  "تحميل...": "加载中...",
  "تأكيد": "确认",
  "عرض": "查看",
  "إرسال": "发送",
  "موافق": "确定",
  "بحث...": "搜索...",
  "تنبيه": "系统提示",
  "تعديل البيانات": "修改资料",
  "يوم": "天",
  "أيام": "天",
  "لوحة التحكم": "控制面板",
  "إدارة المستخدمين": "用户管理",
  "إدارة الغرف": "房间管理",
  "خلفيات مجانية": "免费背景",
  "المتجر": "商店",
  "إيموجي": "表情符号",
  "الهدايا": "礼物",
  "لعبة فواكه": "水果游戏",
  "الصور الرئيسية": "主图轮播",
  "تصميم الوكالات": "代理设计",
  "استلام البلاغات": "举报信箱",
  "إعدادات الحساب": "账户设置",
  "تغيير بريد الحساب": "更改密保邮箱",
  "تحديث البريد الإلكتروني الخاص بدخولك": "更新您用于登录的电子邮箱",
  "تغيير كلمة المرور": "重置密码",
  "تحديث مفتاح الأمان الخاص بحسابك": "更新您的安全保护密码",
  "الدعم الفني": "在线客服",
  "تواصل معنا للمساعدة والاستفسارات": "联系客服解答您的所有疑问",
  "لغة التطبيق": "系统语言",
  "اللغة": "语言",
  "العربية": "العربية (阿拉伯语)",
  "الإنجليزية": "English (英语)",
  "الصينية المبسطة": "简体中文 (Chinese)",
  "أدخل كلمة المرور الجديدة...": "请输入新密码...",
  "كلمة المرور الحالية": "当前密码",
  "متجر يلا بارتي": "Yalla Party 官方商店",
  "مجوهرات": "钻石",
  "عملات": "金币",
  "ذهبية": "金币",
  "شراء": "购买",
  "سعر": "价格",
  "محفظتي": "我的钱包",
  "رصيد": "硬币余额",
  "ذهبي": "黄金金币",
  "مستوى": "等级",
  "متجر الإيموجي": "表情主题店",
  "متجر الهدايا": "豪华礼物屋",
  "تصميم المتجر": "商城装修",
  "تفاصيل الحساب": "账户详情",
  "الحالة": "当前状态",
  "أصدقاء": "好友",
  "متابعين": "粉丝",
  "متابعة": "关注",
  "أتابع": "已关注",
  "طلب متابعة": "发出关注",
  "رسالة": "私信",
  "هدية": "赠送礼物",
  "العضو": "普通成员",
  "شريك": "CP伴侣",
  "لا يوجد": "暂无",
  "الأوسمة والجوائز": "荣誉勋章与奖章",
  "لا توجد شارات حالياً": "目前暂无分配任何勋章",
  "لا يوجد أحد على المايك": "暂无麦位成员",
  "تحديد": "筛选",
  "كل الغرفة": "房间所有人",
  "كل المايك": "所有麦位",
  "عادية": "普通礼物",
  "محظوظة": "幸运礼物",
  "مشاهير": "巨星专属",
  "دولة": "国家限定",
  "ميلاد": "生日快乐",
  "لا يوجد شيء هنا": "这里空空如也",
  "اختر الكمية": "请选择赠送数量",
  "مغادرة المايك": "离开麦位",
  "عرض البيانات": "查看详细资料",
  "أخذ المايك": "上麦",
  "فتح المايك": "开启麦克风",
  "قفل المايك": "禁音麦克风",
  "منشن": "提及 @成员",
  "إدارة العضو": "房间成员管理",
  "طرد من المايك": "请下麦位",
  "كتم المايك": "静音麦克风",
  "إصمات من الغرفة": "房间禁言",
  "طرد من الغرفة": "踢出房间",
  "جاري تحميل الملف الشخصي...": "正在加载资料卡...",
  "فشل فتح المحادثة": "打开聊天面板失败",
  "إعدادات قفل الغرفة": "房间锁密码设置",
  "كلمة مرور الغرفة (6 أرقام)": "房间数字密码 (6位密码)",
  "اترك الحقل فارغاً إذا كنت تريد فتح الغرفة للجميع": "不设密码表示房间完全向所有人公开",
  "قفل الغرفة الآن": "立即启用密码锁",
  "فتح الغرفة للجميع": "解除房间锁开放",
  "احتفاظ": "保留修改",
  "خروج": "退出",
  "المتواجدون": "在线房间数",
  "تحكم المايك": "调节当前麦克风",
  "سبب البلاغ": "请选择举报原因",
  "اباحي": "含黄暴、低俗违规内容",
  "اسائة": "骚扰他人/不良言论",
  "شتائم": "人身攻击、语言挑衅",
  "ترويج": "非法商业推广、引流",
  "يرجى شرح ما حدث بالتفاصيل": "请简明阐述具体发生了什么",
  "اكتب هنا...": "在此处描述...",
  "تقديم البلاغ": "确认向客服递交举报",
  "تم تقديم البلاغ": "您的举报已受理",
  "سيتم المراجعه شكرا لك على الحفاظ على بيئة Yalla Party": "官方团队会尽快对涉及账号进行审查，感谢您对 Yalla Party 社区的维护！",
  "حسناً": "我了解了",
  "نظام شحن الوكالات": "充值代理系统",
  "دخول الغرفة": "进入房间",
  "تسجيل خروج": "安全登出",
  "تم تحديث صورتك": "您的头像修改成功",
  "بروفايلك": "个人展位",
  "مستخدم": "普通用户",
  "وقت": "时间",
  "التاريخ": "日期",
  "عدد": "数量",
  "الملف": "文件",
  "الفواكه Active Bets": "水果游戏当下投注",
  "الفواكه Players": "水果游戏玩家",
  "رصيد الوكالة": "代理金币余额",
  "الحظر": "账号封禁",
  "الأعضاء": "所有会员",
  "أرسل إشعار": "群发全局通知",
  "تنبيه رسمي": "官方通知广播",
  "مستوى المستخدم": "用户等级",
  "شحن إداري": "系统特快充值",
  "سحب عملات": "扣除金币",
  "منح الأوسمة": "发放荣誉勋章",
  "منح عناصر": "赠送商城外观",
  "تغيير الـ ID المتميز": "定制特殊靓号ID",
  "تفعيل/إلغاء نظام الحظر": "激活/注销封禁助手权限",
  "تفعيل/إلغاء نظام المدير العام": "激活/注销总监GM控制面板",
  "تفاصيل الحظر": "封禁操作日志",
  "لا توجد طلبات معلقة": "没有待处理的请求",
  "يريد متابعتك": "想要关注你",
  "لوحة المسؤول": "管理员主面板",
  "المستخدمين": "用户列表",
  "محادثات الدعم": "客服会话",
  "الغرف": "房间列表",
  "الأخبار": "新闻公告",
  "البنرات": "横幅广告",
  "لعبة فواكه": "水果游戏",
  "الصور الرئيسية": "主图轮播",
  "تصميم الوكالات": "代理设计",
  "استلام البلاغات": "举报收件箱",
  "مرحباً بالسيد المدير": "尊敬的全局管理员，祝您工作顺利",
  "لديك كامل الصلاحيات لإدارة المحتوى والمستخدمين.": "您目前处于系统至尊 GM 环境，拥有全端修改权限。",
  "إدارة العضوية": "房间管理员及特殊成员控制",
  "إدارة الوكلاء": "全网代理商、充值分销商资质配置",
  "شحن": "充值",
  "خصم": "扣除",
  "تعديل الـ ID المتميز": "手工重置或设计高能靓号",
  "منح إطار وبادج وعناصر متميزة": "空投全套顶级头像框、车辆及挂件",
  "المستخدمين المعلقين": "限制封锁及临时限权详情名单",
  "إدارة البنرات": "置顶大图活动横幅管理",
  "نظام المدير العام": "总监级全局大系统管理权",
  "إدارة البنرات المتحركه": "活动轮播图精细化管理",
  "إدارة البنرات المتحركة": "活动轮播图精细化管理",
  "رفع صور بنرات جديدة لواجهة التطبيق": "向玩家主界面投递投放最新的广告设计图",
  "إجراءات الحظر وفك الحظر": "针对违规机器和IP执行双项销户禁封",
  "سجلات عمليات الإدارة": "系统操作员日常操作痕迹总账",
  "إعطاء عناصر المتجر": "批量发放官方高奢限定首发外观",
  "إدارة وحذف الغرف": "彻底取缔或暂时暂停异常语音包厢",
  "تحذير أصحاب الغرف أو حذفها نهائياً": "对涉黑/擦边群组发出系统警告甚至强制除名",
  "استلام بلاغات الغرف": "涉及他人、欺诈等检举直梯信箱",
  "مراجعة البلاغات المقدمة ضد الغرف": "调阅取缔被多次举报语音房的详细呈堂供证",
  "إعدادات صفحة الـ CP": "定制伴侣关系主页面的奢华星空背景",

  // English fallbacks to Chinese mapping
  "Home": "首页",
  "News": "新闻",
  "Messages": "消息",
  "Me": "我的",
  "Profile": "个人资料",
  "Admin Panel": "控制面板",
  "The World of Entertainment and Voice Chat": "娱乐与语音群聊世界",
  "Login": "登录",
  "Email Address": "邮箱地址",
  "Password": "密码",
  "Username": "用户名",
  "Register New Account": "注册新账号",
  "Don't have an account?": "还没有账号？",
  "Already have an account?": "已有账号？",
  "Please fill in all details": "请把所有资料填写完整",
  "Logged in successfully": "登录成功",
  "Host Code": "房主专属代码",
  "Leave": "离开",
  "Save": "保存",
  "Edit": "编辑",
  "Delete": "删除",
  "Cancel": "取消",
  "Close": "关闭",
  "Save Changes": "保存修改",
  "Saved successfully": "保存成功",
  "Loading...": "加载中...",
  "Confirm": "确认",
  "View": "查看",
  "Send": "发送",
  "OK": "确定",
  "Okay": "确定",
  "Search...": "搜索...",
  "Notification": "系统通知",
  "Edit Profile": "修改资料",
  "day": "天",
  "days": "天",
  "Control Panel": "控制面板",
  "User Management": "用户管理",
  "Room Management": "房间管理",
  "Free Backgrounds": "免费背景",
  "Store": "商店",
  "Emojis": "表情符号",
  "Gifts": "豪华礼物",
  "Fruits Game": "水果游戏",
  "Main Images": "主图轮播",
  "Agency Design": "代理设计",
  "Reports Received": "举报收件箱",
  "Account Settings": "账户设置",
  "Change Account Email": "修改登录邮箱",
  "Update your sign-in email address": "修改你的登录主防邮箱",
  "Update your account security key": "修改你账号的专属支付与安全密码",
  "Technical Support": "技术支持",
  "Contact us for help and inquiries": "联系客服解答您的所有疑问",
  "App Language": "应用语言",
  "Language": "语言",
  "Arabic (العربية)": "阿拉伯语 (العربية)",
  "English": "English (英语)",
  "Enter new password...": "请输入新密码...",
  "Current Password": "当前运行密码",
  "Yalla Party Store": "Yalla Party 官方商店",
  "Diamonds": "钻石",
  "Coins": "金币",
  "Gold": "黄金金币",
  "Buy": "购买",
  "Price": "价格",
  "My Wallet": "我的钱包",
  "Balance": "可用金币余额",
  "Level": "等级",
  "Emoji Store": "表情主题店",
  "Gift Store": "炫酷礼物商城",
  "Store Design": "商店外观定制",
  "Account Details": "账户完整详情",
  "Status": "状态",
  "Friends": "好友",
  "Followers": "粉丝",
  "Following": "关注",
  "Follow Request": "关注请求",
  "Message": "私密消息",
  "Gift": "礼物",
  "Member": "房间成员",
  "Partner": "CP伴侣",
  "None": "无",
  "Badges & Medals": "荣誉勋章与奖章",
  "No badges currently available": "目前尚无获得勋章",
  "No one is on mic": "暂无上麦成员",
  "Select": "选择",
  "All Room": "房间全员",
  "All Mics": "所有麦成员",
  "Normal": "普通礼物",
  "CP": "浪漫CP",
  "Famous": "网络名人",
  "Country": "国家专享",
  "VIP": "VIP贵宾",
  "Birthday": "生日定制",
  "Nothing here": "这里空空如也",
  "Select Quantity": "请选择赠送数量",
  "Leave Mic": "主动下麦",
  "View Profile": "查看资料卡",
  "Take Mic": "立即上麦",
  "Unlock Mic": "解除禁麦",
  "Lock Mic": "关闭上麦",
  "Mention": "艾特提醒",
  "Manage Member": "管理成员",
  "Kick from Mic": "抱下麦克风",
  "Mute Mic": "单体静音",
  "Silence in Room": "房间发言禁言",
  "Kick from Room": "房间黑名单移出",
  "Loading profile...": "正在极速加载资料卡...",
  "Failed to open chat": "无法打开聊天窗口",
  "Room Lock Settings": "房间限制加密设置",
  "Room Password (6 Digits)": "6位数字密码",
  "Leave empty to open the room to everyone": "留空为免密码全面开放房间",
  "Lock Room Now": "应用并加密房间",
  "Open to All": "向所有人开放",
  "Open Room to All": "解除房间锁全面开放",
  "Keep": "维持现状",
  "Exit": "离开",
  "Online": "在线列表",
  "Mic Control": "麦克风控制器",
  "Report Reason": "选择控诉类型",
  "Pornographic": "涉暴涉黄违规",
  "Abuse": "刷屏骚扰",
  "Slander": "违规或攻击语言",
  "Promotion": "恶意发广告/营销",
  "Please explain in detail what happened": "请具体详尽写出遇到的违规情况",
  "Write here...": "请在这里描述...",
  "Submit Report": "递交至后台审核",
  "Report Submitted": "您的举报已成功递交",
  "It will be reviewed. Thank you for keeping Yalla Party a safe community!": "官方团队会尽快审查该行为。感谢您！",
  "Logout of Account": "注销账户",
  "Changing language will dynamically convert the entire application interface and layout directions.": "更改语言选择将会实时转换您的应用页面与显示对齐方式。",
  "Create Room": "创建全新语音房",
  "Room Name": "新语音房名称",
  "Enter Room Name": "在此输入房间名称...",
  "Room Category": "房间主属性类型",
  "Create Room Now": "立即激活并创建",
  "Join": "极速加入",
  "Enter Room ID": "请输入6位房间 ID 号...",
  "Join Room": "加入所属语音房",
  "Private Chat": "双人私密空间",
  "Send a message...": "在这里输入内容...",
  "Admin Control Panel": "总控GM面板",
  "User Ban System": "黑名单封禁管理",
  "Official Notification": "管理员通知广播",
  "No pending requests": "暂无未读的追随请求",
  "wants to follow you": "向您发送了合意关注请求",
  "Banned Devices": "设备硬件锁定管理",
  "Agency Wallet": "代理金币金库",
  "Agency Management": "分销充值商渠道管理",
  "Manage": "快捷管理操作",
  "User Info": "用户总账资料",
  "Ban Device": "硬件机器锁定封禁",
  "Unban Device": "机器锁一键拔除",
  "Ban User": "拉黑封断该账号",
  "Unban User": "解除该账号黑名单",
  "Add Item": "发放背包道具",
  "Give Diamonds": "赠送钻石克拉",
  "Give Coins": "充填代理金币",
  "Send Notification": "系统群发横幅",
  "Default Images": "后台预置主图",
  "Set Design": "应用皮肤背景",
  "Reports": "处理举报件",
  "Accept": "同意并通过",
  "Reject": "驳回或拒绝",
  "Simplified Chinese": "简体中文",
  "Apps Language": "应用语言",
  "Logout": "退出登录",

  // Additional rich dictionary keys (Arabic & English keys to Chinese)
  "شحن كوينز": "充值金币",
  "خصم كوينز": "扣减金币",
  "الكمية...": "数量...",
  "المبلغ...": "数量...",
  "الرسائل الرسمية": "官方消息",
  "حذف الغرفة": "删除房间",
  "طرد المايك": "抱下麦位",
  "كتم المايك": "麦克风静音",
  "إصمات": "房间禁言",
  "طرد": "踢出房间",
  "تسجيل الخروج من الحساب": "安全登出",
  "حظر جهاز": "锁定机器号",
  "إلغاء حظر جهاز": "解除设备封禁",
  "حظر مستخدم": "封禁账号",
  "إلغاء حظر مستخدم": "解除账号封禁",
  "منح الآي دي": "定制特殊靓号ID",
  "الآي دي الحالي": "当前ID编号",
  "عدد الأيام": "有效期天数",
  "عضو": "房间成员",
  "مشرف": "核心管理员",
  "مالك": "主创房主",
  "طلب ارتباط": "契约结伴CP",
  "الأصدقاء": "好友中心",
  "إعدادات الغرفة": "房间锁安全设置",
  "تغيير الخلفية": "更换主题皮肤",
  "خلفيات المتجر": "商店定制背景",
  "إطارات المتجر": "至尊荣誉头像框",
  "دخوليات المتجر": "炫酷豪华跑车特效",
  "دخول الأبطال": "英雄座驾入场特权",
  "تفاح": "🍎 苹果",
  "برتقال": "🍊 橙子",
  "ليمون": "🍋 柠檬",
  "خوخ": "🍑 桃子",
  "فراولة": "🍓 草莓",
  "مانجو": "🥭 芒果",
  "بطيخ": "🍉 西瓜",
  "كرز": "🍒 樱桃",
  "فترة الرهان": "竞想竞标倒计时",
  "ثانية": "秒",
  "جاري تحديد الفائز...": "正在开启竞猜转盘...",
  "هو الرابح!": "是本局赢家！",
  "مبارك! ربحت ": "恭喜大捷！赢下金币奖励 ",
  "اختر مبلغ الرهان": "请设置单注金币数額",
  "المراهنة: ": "当前下注总额: ",
  "النتائج السابقة": "历史轮次结果",
  "بانتظار الجولة الأولى...": "新一轮即将开始，等候中...",
  "وكالة الشحن": "分销充值资质配置",
  "سجل العمليات": "高权管理操作日志流水",
  "سجلات الحظر": "封禁冻结处罚详细单据",
  "إعطاء عناصر المتجر": "一键发放背包商城挂饰",
  "اختر المستخدم": "指定受赠目标会员",
  "ابحث بالاسم أو ID...": "输入昵称或6位ID号码检索...",
  "تغيير": "重设/修改",
  "اختر العنصر": "选择要发放的外观道具",
  "إطارات": "豪华边框/头像框",
  "دخوليات": "入场酷炫座驾",
  "خلفيات": "高级背景皮肤",
  "المدة بالأيام": "发放体验有效天数",
  "منح العنصر الآن": "立即确认空投发放",
  "تم المنح بنجاح!": "该福利道具成功发放！",
  "مساعد وكالة": "授权二级交易渠道配置",
  "محفظة الوكالة": "分销专款公账存储库",
  "شحن وكالة": "向商户补充额度金币",
  "تفاصيل العمليات": "资金交易明细全盘往来",
  "طلب ارتباط (CP)": "CP亲密绑定申请",
  "تصميم وتعديل الـ ID المخصص": "定制及调配专属高光靓ID",
  "معاينة البروفايل (90 × 28)": "个人展卡高光预览 (90 × 28)",
  "أيقونة زر الهدايا": "礼物按钮图标设计",
  "اختر الأيقونة": "选择或上传图标设计",
  "أو ضع رابط الأيقونة هنا": "或者在此输入远程链接",
  "سحب الرصيد": "扣除回收金币资金",
  "تعديل وتصميم الـ ID المتميز": "修改并定制最高靓ID",
  "العنوان": "通知标题",
  "التفاصيل": "内容描述/详情",
  "البريد": "邮箱管理",
  "تغيير البريد الإلكتروني": "更新登录主邮箱",
  "تغيير البريد": "更新密保登录邮箱",
  "تغيير الباسورد": "更改密保安全密码",
  "أخبرنا بالمشكلة": "请在线详述遇到的困难...",
  "يرجى توضيح المشكلة": "联系系统高级技术人员在线处理",
  "إرسال رسالة للدعم": "立即递交反馈",
  "هل تريد طرد": "确定要将此人强降离开或踢出吗？",
  "فشل": "发生错误/操作失败",
  "تم": "操作完成/成功",
  "إضافة عنصر": "向商店增加全新上架商品",
  "اسم الصنف": "外观道具名称",
  "سعر العنصر": "定价(游戏金币)",
  "مدة الصلاحية": "有效期期限(天)",
  "أيقونة العنصر": "图片或动态框图地址",
  "تحميل الصورة": "上传实物预览大图",
  "دخولية الملك": "帝王座驾特效/大轿入屏",
  "تنين اللورد": "领主神龙入场特效",
  "سيارة رياضية": "豪华跑车入场特效",
  "برق ورعد": "九天雷劫入场特技",
  "خلفية ديسكو": "迪斯科狂热霓虹墙纸",
  "خلفية هادئة": "慵懒微醺幽静壁纸",
  "إطار ملكي": "皇家璀璨王冠头像框",
  "إطار الورد": "浪漫百合繁花头像框",
  "خلفية الفضاء": "太空飞梭科幻星幕背景",
  "سيستم الحظر نشط": "封禁系统激活",
  "بدون نظام حظر": "暂无封禁系统",
  "نظام المدير نشط": "管理系统激活",
  "بدون نظام مدير": "暂无系统权限",
  "كلمة المرور:": "密保密码:",
  "غير متوفرة بعد": "暂未记录",

  // Room Alerts & Dialogs
  "لقد تم طردك من هذه الغرفة": "您已被从此房间踢出或封禁。",
  "لقد تم كتمك من الكتابة والدردشة في هذه الغرفة": "您已被在此房间中禁言，无法发送文字。",
  "يرجى اختيار هدية أولاً": "请先选择一个礼物",
  "يرجى اختيار شخص واحد على الأقل لإرسال الهدية": "请选择至少一位赠送对象",
  "رصيدك غير كافٍ لإرسال الهدية": "您的金币余额不足，无法赠送此礼物。",
  "حدث خطأ أثناء إرسال الهدية": "赠礼过程中发生错误，请重试。",
  "يرجى إدخل اسم للغرفة": "请输入房间名称",
  "حدث خطأ أثناء التحديث": "修改更新时发生错误。",
  "يرجى شرح ما حدث بمزيد من التفاصيل": "请简要阐明具体遇到的违规细节。",
  "خطأ في إرسال البلاغ": "递交举报内容失败。",
  "خطأ في تحديث قفل الغرفة": "更新房间锁定状态失败。",
  "تم طرد العضو من المايك بنجاح": "已成功抱下麦位。",
  "العضو ليس متواجداً على أي مايك حالياً": "该用户目前不处于任何麦位。",
  "تم كتم مايك العضو بنجاح": "已成功禁音该会员的麦克风。",
  "تم إلغاء كتم مايك العضو": "已解除该会员的麦克风静音。",
  "تم إصمات العضو من الغرفة بنجاح": "已成功对该用户执行房间禁言。",
  "تم إلغاء إصمات العضو في الغرفة": "已解除该用户的房间禁言。",
  "تم طرد العضو من الغرفة بنجاح": "已成功将该成员踢出房间。",
  "تم إلغاء طرد العضو من الغرفة": "已解除该成员的房间禁禁。",
  "فشلت العملية، يرجى المحاولة لاحقاً": "操作失败，请稍后重试。",
  "تم كتم المايكروفون الخاص بك من قبل الإدارة": "您的麦克风已被房主或管理员禁音。",

  // Profile / Relationship Keys
  "ادخل ID صديقك المفضل": "请输入您好友的ID",
  "ID الصديق...": "好友ID...",
  "بحث وإرسال": "搜索并递送",
  "تأكيد طلب الارتباط": "确认建立亲密CP关系绑定",
  "هل أنت متأكد من طلب الارتباط بـ ": "您确定要与此用户申请CP契约绑定吗：",
  "تكلفة الطلب:": "申请资费：",
  "نعم، أرسل الطلب": "是的，立即发送申请",
  "تراجع": "返回/取消",
  "تأكيد إنهاء العلاقة": "确认解散CP关系",
  "سيتم تعويض شريكك بـ 100,000,000 عملة ذهبية مقابل فك الارتباط. هل أنت متأكد؟": "解散关系将自动从您的账户扣减 1 亿金币作为退婚补偿金。您确定吗？",
  "رسوم التعويض:": "解约补偿资费：",
  "نعم، فك الارتباط": "是的，确定解约",
  "تغيير بريد الحساب": "更新密保邮箱",
  "تغيير كلمة المرور": "更改密码",
  "لغة التطبيق": "应用语言",
  "الدعم الفني": "在线客服及技术支持",
  "اختر لغة التطبيق المفضلة": "请选择您日常使用的语言",
  "تحديث البريد الإلكتروني الخاص بدخولك": "更新您用于安全登录的邮箱",
  "تحديث مفتاح الأمان الخاص بحسابك": "自主修改您的账户安全访问密码",
  "تواصل مباشر مع فريق الدعم": "联系高级专人在线客服援助",
  "تسجيل الخروج من الحساب": "注销并安全登出该账户",
  "تغيير اللغة سيقوم بتحويل واجهة التطبيق بالكامل مع دعم اتجاه النصوص المناسب.": "切换语言将实时翻译整体应用布局与文字方向偏好。",
  "* ملاحظة: عند تغيير البريد الإلكتروني، ستحتاج لاستخدامه في المرة القادمة لتسجيل الدخول. تأكد من أن البريد الجديد صالح وتستطيع الوصول إليه.": "* 提示：邮箱修改后，请使用最新的邮箱地址登录。请务必确认新邮箱真实有效。",
  "البريد الإلكتروني الجديد": "新邮箱地址",
  "تأكيد وحفظ البريد الجديد": "立即确认并绑定新邮箱",
  "* ملاحظة: يجب أن تكون كلمة المرور قوية (6 أحرف على الأقل). سيتم تطبيق التغيير فوراً على حسابك.": "* 提示：安全密码至少需要6位字符。修改成功后全端生效。",
  "كلمة المرور الجديدة": "新登录密码",
  "تأكيد وحفظ كلمة المرور": "立即保存并更新密码",
  "أهلاً بك في الدعم الفني، اكتب رسالتك وسنقوم بالرد عليك في أقرب وقت.": "欢迎使用官方在线客服。请在此详述您的问题，我们将在第一时间回复您。",
  "خدمة العملاء": "在线官方客服",
  "اكتب رسالتك للدعم هنا...": "请输入您向反馈客服提交的问题...",
  "تعديل الملف الشخصي": "编辑个人档案",
  "الاسم المستعار": "昵称",
  "السيرة الذاتية (Bio)": "个人签名",
  "البلد / المنطقة": "国家/海内外地区",
  "اختر بلدك...": "地区检索及选择...",
  "يمكن تغيير الدولة مرة واحدة فقط كل 3 أيام": "行政国家或地区每隔3天期限仅允许更改修改一次。",
  "حفظ التغييرات": "保存修改并更新",
  "اختر بلدك": "选择所属国家/地区",
  "ابحث عن بلد...": "输入国家名检索...",
  "لا توجد نتائج للبحث": "暂无匹配项",

  // Messages & Direct Chat
  "مرحباً بك! هيا بنا لندردش.": "你好！很高兴认识你，让我们开始聊天吧。",
  "فشل تحديد معرف المستخدم": "查找定位用户ID失败",
  "الرسائل": "消息板块",
  "قريباً": "敬请期待",
  "طلبات المتابعة": "关注请求列表",
  "لديك": "您有",
  "طلب متابعة جديد": "个新关注申请",
  "لا توجد طلبات معلقة حالياً": "目前暂无未处理的申请",
  "لا توجد محادثات نشطة": "暂无处于活动状态的对话",
  "مستحدم": "普通用户",
  "لا توجد طلبات معلقة": "暂无待处理的申请",
  "يريد متابعتك": "向您发起了关注申请",
  "اكتب رسالة لبدء الدردشة": "在这里输入文字发起畅聊",
  "اكتب رسالة...": "请输入聊天内容...",

  // Store & VIP
  "رصيدك غير كافٍ لإتمام عملية الشراء!": "您的钱包余额不足，无法购买该道具！",
  "تم تجديد المدة بنجاح! تم إضافة ": "续期成功！已在当前时效上成功添加 ",
  " أيام إلى مدة العنصر الحالية.": " 天的有效期。",
  "تم الشراء بنجاح! تم نقل العنصر إلى حقيبتك.": "购买成功！该精美外观已存入“我的背包”。",
  "حدث خطأ أثناء الشراء.": "抱歉，商品购买未成功，请重试。",
  "تم الارتداء بنجاح": "已成功穿戴佩戴。",
  "فشل الارتداء.": "配备穿戴失败。",
  "تم الخلع بنجاح": "已成功解除配备。",
  "متجر يلا بارتي": "Yalla Party 官方商店",
  "الإطارات": "精美国风头像框",
  "الدخوليات": "炫酷跑车入场座驾",
  "الخلفيات": "高级房间主题背景",
  "جاري تحميل المتجر...": "商品列表拼命加载中...",
  "إطارات": "头像框",
  "دخوليات": "专属座驾",
  "خلفيات": "房间壁纸",
  "لا يوجد شيء هنا yet": "此分类暂未上架商品",
  "لا يوجد شيء هنا": "这里空空如也",
  "متبقي: ": "到期剩余: ",
  "خلع": "卸下/解除",
  "ارتداء": "佩戴/使用",
  "أيام": "天",
  "شحن رصيد": "金币充值",
  "تأكيد عملية الشراء": "确认购买外观商品",
  "المدة: ": "体验有效期: ",
  "تأكيدوشراء الآن": "立即确认并扣减购买",
  "تأكيد وشراء الآن": "立即确认并扣减购买",
  "تم بنجاح!": "交易成功！",
  "رائع": "太棒了",

  // Create Room Modal
  "يرجى إكمال جميع البيانات واختيار خلفية": "请填写完整房间资料并挑中一款壁纸封面",
  "مستخدم جديد": "萌新用户",
  "تم إنشاء الغرفة بنجاح!": "您的专属语音派对房搭建成功！",
  "إنشاء غرفة صوتية": "极速创建派对语音房",
  "صورة الغرفة": "房间封面/LOGO",
  "اسم الغرفة": "房间标题",
  "مثلاً: سهرة الوناسة...": "例如：今晚彻夜畅聊...",
  "وصف الغرفة": "房间副标题/公告",
  "وصف ترحيبي لزوار الغرفة...": "在这里写下一段热烈欢迎游客的简介...",
  "المنشئ": "房主主创",
  "خلفية الغرفة": "语音房间主背景",
  "اختر خلفية مميزة لغرفتك": "在预置的高清主题墙纸中选一个",
  "اختر خلفية الغرفة": "选择房间背景皮肤",
  "إطلاق الغرفة الآن": "立即启动并进入派对房间",

  // General App / Navigation
  "غرف صوتية": "热门推荐语音房",
  "الرئيسية": "首页",
  "أخبار": "官方头条",
  "إنشاء": "创建房间",
  "رسائل": "聊天消息",
  "أنا": "个人中心",
  "تنبيه": "系统安全警示",
  "عذراً لديك غرفة بالفعل": "抱歉，您名下已拥有一间注册语音房",
  "فهمت ذلك": "我已悉知",
  "هذه الغرفة مغلقة": "此高级房间已启用密码锁定",
  "أدخل كلمة المرور": "请输入进入密码",

  // Aviator / Plane Crash Game Keys
  "لعبة الطائرة": "冲天飞机 (幸存者)",
  "متبقي على طيران الطائرة": "距离下班航班起航",
  "ثانية": "秒",
  "الوضع الحالي لتشغيل": "当前巡航状态",
  "نشطة ومثبتة": "极速飙升翱翔中",
  "ارتفاع التحطم": "航班不幸逃逸于",
  "اكتب رهانك الآن": "请在起飞前完成投注",
  "الرهان يبدأ خلال بضع ثواني...": "抓紧登机时刻，选择合适金币压入",
  "معامل الربح الحالي": "实时爆发乘数",
  "طارت الطائرة!": "飞机已突破航线飞走了！",
  "لقد تحطمت الطائرة عند معامل": "航班在以下乘数点不幸断联:",
  "تم استرداد المبلغ بنجاح": "恭喜！成功套现平仓",
  "مبروك! ربحت ": "恭喜！您本次成功斩获: ",
  "كوينز": "金币",
  "السحب التلقائي للأرباح": "自动止盈套现",
  "اسحب الرهان تلقائياً عند معامل معين": "开启后，达到设定乘数自动落袋为安",
  "حدد مبلغ الرهان للطيران": "设定本次登机所需金币",
  "مقدار الرهان الحالي: ": "您在本局的已投金币: ",
  "مبلغ مخصص": "其他自定义金额",
  "بانتظار الإقلاع في الجولة التالية...": "已成功押注，等待下一班航班起飞",
  "تأكيد رهان الطيران الآن": "立即投币登机 (下局起飞)",
  "شاهد طيران الطائرة...": "正在观战本期航班航线...",
  "شاهد طيران الطيارة...": "正在观战本期航班航线...",
  "تم استلام الأرباح لديك": "本局奖励已派发至您的安全账户",
  "سحب الأرباح الآن": "立即紧急平仓套现",
  "برجاء الانتظار لجولة رهان جديدة...": "航班已结束。请等待系统重置跑道...",
  "قائمة الألعاب": "派对娱乐游戏大厅",
  "لعبة الفواكه": "经典水果机狂欢",
  "قريباً": "全新玩法敬请期待"
};

// Recursive translator for dynamic messages from English to Simplified Chinese
export const translateEnToZh = (enText: string): string => {
  if (!enText) return enText;
  let text = enText.trim();

  // If there is an exact key in our merged dictionary, use it
  if (chineseDictionary[text]) {
    return chineseDictionary[text];
  }

  // Regex rules to map translated English dynamic admin notices to Chinese
  const rules = [
    {
      regex: /Congratulations!\s+You\s+received\s+([\d,]+)\s+coins\s+from\s+the\s+bar\s+wealth\s+of\s*"(.*?)"\./i,
      replace: (_: string, coins: string, owner: string) => {
        return `恭喜！您从 “${owner}” 的吧财富中获得了 ${coins} 金币。`;
      }
    },
    {
      regex: /Congratulations!\s+You\s+received\s+a\s+premium\s+(frame|room entry|room background|item)\s*\((.*?)\)\s*for\s*(\d+)\s*days\.\s*Check\s*it\s*now\s*in\s*your\s*Bag\s*in\s*the\s*Store\./i,
      replace: (_: string, type: string, name: string, days: string) => {
        const typeZh: Record<string, string> = { "frame": "头像框", "room entry": "专属座驾/入场特权", "room background": "房间定制壁纸", "item": "背包道具" };
        const nameZh = translateItemNameToZh(name);
        return `恭喜！您获得了高级${typeZh[type] || '道具'} (${nameZh})，有效期 ${days} 天。请现在前往【商店 - 我的背包】中查看并佩戴！`;
      }
    },
    {
      regex: /The\s+Administration\s+has\s+granted\s+you\s+a\s+special\s+frame\s+named\s*"(.*?)"\s*for\s*(\d+)\s*days\.\s*Check\s*it\s*now\s*in\s*your\s*store\s*settings!/i,
      replace: (_: string, name: string, days: string) => {
        return `主创管理团队已为您注入了名为“${translateItemNameToZh(name)}”的专属荣誉头像框（${days}天），现已发放至您的账户商店设置。`;
      }
    },
    {
      regex: /The\s+Administration\s+has\s+granted\s+you\s+a\s+custom\s+room\s+theme\/background\s+named\s*"(.*?)"\s*for\s*(\d+)\s*days\.\s*Check\s*it\s*now\s*in\s*your\s*voice\s*room\s*settings!/i,
      replace: (_: string, name: string, days: string) => {
        return `主创管理团队已为您当前的语音房授予了定制背景：“${translateItemNameToZh(name)}” （有效期 ${days} 天），请进入包厢内切换。`;
      }
    },
    {
      regex: /The\s+Administration\s+has\s+granted\s+your\s+profile\s+an\s+awesome\s+animated\s+profile\s+photo!\s+Enjoy\s+your\s+new\s+custom\s+look\./i,
      replace: () => "主创管理团队已为您的个人名片背景授予了专属动态头像！快去展示您的全新外观吧。"
    },
    {
      regex: /The\s+Administration\s+has\s+gifted\s+your\s+room\s*"(.*?)"\s*an\s+exclusive\s+premium\s+animated\s+cover\s+logo\.\s*See\s*your\s*channel's\s*fresh\s*style\s*now!/i,
      replace: (_: string, titleName: string) => {
        return `主创管理团队已为您拥有的 "${titleName}" 房间配置了尊贵酷炫的动态立体头像封面，赶快进入房间鉴赏吧！`;
      }
    },
    {
      regex: /([\d,]+)\s+Gold\s+Coins\s+have\s+been\s+recharged\s+to\s+your\s+account\s+by\s+the\s+Administration\.\s*Enjoy!/i,
      replace: (_: string, amount: string) => {
        return `【系统充值】管理团队已成功向您划转了 ${amount} 金币，祝您在 Yalla Party 天天开心！`;
      }
    },
    {
      regex: /([\d,]+)\s+Gold\s+Coins\s+have\s+been\s+debited\s+from\s+your\s+account\s+by\s+the\s+Administration\./i,
      replace: (_: string, amount: string) => {
        return `【行政扣除】管理部门已从您的账户中扣收了 ${amount} 金币余额。`;
      }
    },
    {
      regex: /Congratulations!\s+You\s+received\s+an\s+exclusive\s+unique\s+ID\s+from\s+the\s+Administration\.\s+Your\s+new\s+ID\s+is:\s*(\w+)/i,
      replace: (_: string, newId: string) => {
        return `恭喜喜报！官方团队已为您授予了至尊定制 ID 靓号：${newId}。祝您好运相伴！`;
      }
    },
    {
      regex: /You\s+have\s+been\s+authorized\s+to\s+use\s+the\s+User\s+Ban\s+System\.\s+Access\s+privileges\s+are\s+active;\s+find\s+it\s+in\s+your\s+profile\s+menu\s+now\./i,
      replace: () => "权限变更：您当前已被分配黑名单设备及用户的【安全禁言封禁权限】。现在可以在个人中心侧边栏看到了。"
    },
    {
      regex: /The\s+User\s+Ban\s+System\s+access\s+was\s+revoked\s+from\s+your\s+account\s+due\s+to\s+rules\s+violations\./i,
      replace: () => "安全警示：由于多次违反黑名单行为准则，系统安全部已收回了您对【设备与用户禁封系统】的调用控制权。"
    },
    {
      regex: /Congratulations!\s+You\s+have\s+been\s+granted\s+full\s+permissions\s+for\s+the\s+General\s+Manager\s+Panel\.\s+Open\s+your\s+profile\s+menu\s+to\s+configure\s+and\s+manage\./i,
      replace: () => "权限加冕！您已被授予 GM (总监、总经理) 级全局大系统管理权。点击头像卡片可一键启用控制面板操作。"
    },
    {
      regex: /Access\s+to\s+the\s+General\s+Manager\s+Panel\s+has\s+been\s+revoked\s+from\s+this\s+account\s+due\s+to\s+guideline\s+violations\./i,
      replace: () => "控制警示：由于近期管理账号偏离公理运营政策，您对 GM（总监）全局控制台的特殊特许访问已被收回。"
    },
    {
      regex: /Warning:\s+We\s+have\s+received\s+multiple\s+reports\s+against\s+your\s+voice\s+room\s+recently\.\s+Please\s+adhere\s+strictly\s+to\s+user\s+safety\s+guidelines,\s+otherwise\s+your\s+account\s+may\s+be\s+banned\s+and\s+your\s+room\s+suspended\.\s+We\s+hope\s+you\s+enjoy\s+your\s+special\s+highlights\s+here\./i,
      replace: () => "官方警告：我们监测及接收到多名成员联手对您的语音包厢提交的严重违规检举。请务必纠正不良聊天行为，合规经营，否则在必要时官方将封停房间并对账号做封禁处理！"
    },
    {
      regex: /Congratulations!\s+You\s+received\s+the\s+user\s+shipping\s+panel\s+and\s+became\s+an\s+authorized\s+agent\s+with\s+a\s+welcome\s+balance\s+of\s+([\d,]+)\s+Gold\./i,
      replace: (_: string, coins: string) => {
        return `热烈祝贺！您已正式完成特约金币分销直充商备案代理资格的签署，系统已向您的代理金库中充入首批政策欢迎启动资金金币：${coins}枚！`;
      }
    },
    {
      regex: /We\s+regret\s+to\s+inform\s+you\s+that\s+the\s+Shipping\s+Agency\s+credentials\s+have\s+been\s+revoked\s+from\s+your\s+official\s+account\./i,
      replace: () => "代理通知：我们很抱歉通知您，您的授权分销商充值账号已被系统注销、资格终止。"
    },
    {
      regex: /A\s+balance\s+of\s+([\d,]+)\s+credits\s+was\s+added\s+to\s+your\s+Shipping\s+Agency\s+wallet\s+by\s+the\s+Administration\./i,
      replace: (_: string, amount: string) => {
        return `主创团队已向您的特约分销钱包补入额度划转资金：${amount} 金币。`;
      }
    },
    {
      regex: /A\s+balance\s+of\s+([\d,]+)\s+credits\s+was\s+deduced\s+from\s+your\s+Shipping\s+Agency\s+wallet\s+by\s+the\s+Administration\./i,
      replace: (_: string, amount: string) => {
        return `财务通知：主创管理团队已从您的代理库存钱包减记了特装划款：${amount} 金币。`;
      }
    },
    {
      regex: /(.*?)\s+proposed\s+to\s+pair\s+\/\s+bond\s+CP\s+relationship\s+with\s+you\./i,
      replace: (_: string, name: string) => `【求婚告白】成员 "${name}" 极其浪漫地向您发起连接，渴望与您结合并向全世界昭示你们的神仙眷侣CP！`
    },
    {
      regex: /The\s+other\s+partner\s+dissolved\s+the\s+CP\s+link\s+and\s+compensated\s+you\s+with\s+([\d,]+)\s+Gold\s+Coins\./i,
      replace: (_: string, amount: string) => `亲密警报：您的另一半已向红娘服务器支付协议解冻费用，单方面宣布解体CP关系。对方已扣除并补偿给您：${amount} 黄金。`
    },
    {
      regex: /Congratulations!\s+You\s+have\s+successfully\s+recharged\s+([\d,]+)\s+Coins\s+from\s+Shipping\s+Agent\s+\((.*?)\)\s*\(ID_(\w+)\)/i,
      replace: (_: string, coins: string, name: string, id: string) => {
        return `充值到账：您通过官方许可金牌渠道商 ${name} (ID: ${id}) 充值的 ${coins} 黄金已安全入账，请前往资产面板详单查收。`;
      }
    }
  ];

  for (const item of rules) {
    if (item.regex.test(text)) {
      return text.replace(item.regex, item.replace as any);
    }
  }

  // Soft fallback for word replacements
  return text
    .replace(/\bCongratulations\b/gi, "恭喜")
    .replace(/\bloading\b/gi, "加载中")
    .replace(/\berror\b/gi, "发生错误")
    .replace(/\bRoom\b/gi, "房间")
    .replace(/\bUser\b/gi, "用户")
    .replace(/\bBanned\b/gi, "已封禁")
    .replace(/\bJoined\b/gi, "已加入")
    .replace(/\bRecharged\b/gi, "已充值")
    .replace(/\bsuccessfully\b/gi, "成功")
    .replace(/\bfailed\b/gi, "失败");
};

const translateItemNameToZh = (name: string): string => {
  const dictionary: Record<string, string> = {
    "إطار النجوم": "星空头像框",
    "إطار ذهبي": "黄金勋章头像框",
    "تنين اللورد": "领主圣龙入座动效",
    "سيارة رياضية": "豪华跑车入场座驾",
    "برق ورعد": "雷炎电劫酷炫特效",
    "خلفية ديسكو": "动感迪斯科闪烁背景",
    "خلفية هادئة": "慵懒黄昏幽雅背景",
    "إطار ملكي": "皇家至尊皇冠框",
    "إطار الورد": "浪漫玫瑰千绯头像框",
    "دخول الأبطال": "英雄凯旋狂奔入座",
    "دخولية الملك": "帝王九五仪仗特权",
    "خلفية الفضاء": "太空梦境深邃星幕"
  };
  return dictionary[name.trim()] || name;
};

// A core dictionary for global, dynamic, or highly reused strings.
// For other strings, we can pass the English fallback directly inline: e.g., t("اسم الغرفة", "Room Name")
export const globalDictionary: Record<string, string> = {
  // Navigation / Tabs
  "الرئيسية": "Home",
  "أخبار": "News",
  "الرسائل": "Messages",
  "أنا": "Me",
  "الملف الشخصي": "Profile",
  "رسائل": "Messages",
  "أخبار": "News",
  
  // App Name
  "Yalla Party": "Yalla Party",
  "يلا بارتي": "Yalla Party",
  
  // Login / Auth
  "عالم الترفيه والدردشة": "The World of Entertainment and Voice Chat",
  "تسجيل الدخول": "Login",
  "البريد الإلكتروني": "Email Address",
  "كلمة المرور": "Password",
  "اسم المستخدم": "Username",
  "إنشاء حساب جديد": "Register New Account",
  "ليس لديك حساب؟": "Don't have an account?",
  "لديك حساب بالفعل؟": "Already have an account?",
  "أكمل البيانات": "Please fill in all details",
  "تم تسجيل الدخول بنجاح": "Logged in successfully",
  "رمز المضيف": "Host Code",
  
  // General Buttons & Common phrases
  "مغادرة": "Leave",
  "حفظ": "Save",
  "تعديل": "Edit",
  "حذف": "Delete",
  "إلغاء": "Cancel",
  "إغلاق": "Close",
  "حفظ التغييرات": "Save Changes",
  "تم الحفظ": "Saved successfully",
  "تحميل...": "Loading...",
  "تأكيد": "Confirm",
  "عرض": "View",
  "إرسال": "Send",
  "موافق": "OK",
  "بحث...": "Search...",
  "تنبيه": "Notification",
  "تعديل البيانات": "Edit Profile",
  "يوم": "day",
  "أيام": "days",
  
  // Control Panel Header & Tabs
  "لوحة التحكم": "Control Panel",
  "إدارة المستخدمين": "User Management",
  "إدارة الغرف": "Room Management",
  "أخبار": "News",
  "خلفيات مجانية": "Free Backgrounds",
  "المتجر": "Store",
  "إيموجي": "Emojis",
  "الهدايا": "Gifts",
  "لعبة فواكه": "Fruits Game",
  "الصور الرئيسية": "Main Images",
  "تصميم الوكالات": "Agency Design",
  "استلام البلاغات": "Reports Received",
  "الرسائل": "Messages",
  
  // Profile / Settings Menu
  "إعدادات الحساب": "Account Settings",
  "تغيير بريد الحساب": "Change Account Email",
  "تحديث البريد الإلكتروني الخاص بدخولك": "Update your login email address",
  "تغيير كلمة المرور": "Change Password",
  "تحديث مفتاح الأمان الخاص بحسابك": "Update your account security key",
  "الدعم الفني": "Technical Support",
  "تواصل معنا للمساعدة والاستفسارات": "Contact us for help and inquiries",
  "لغة التطبيق": "App Language",
  "اللغة": "Language",
  "العربية": "Arabic (العربية)",
  "الإنجليزية": "English",
  "أدخل كلمة المرور الجديدة...": "Enter new password...",
  "كلمة المرور الحالية": "Current Password",
  
  // Store / VIP / Wallets
  "متجر يلا بارتي": "Yalla Party Store",
  "مجوهرات": "Diamonds",
  "عملات": "Coins",
  "ذهبية": "Gold",
  "شراء": "Buy",
  "سعر": "Price",
  "محفظتي": "My Wallet",
  "رصيد": "Balance",
  "ذهبي": "Gold",
  "مستوى": "Level",
  "متجر الإيموجي": "Emoji Store",
  "متجر الهدايا": "Gift Store",
  "تصميم المتجر": "Store Design",
  "تفاصيل الحساب": "Account Details",
  "الحالة": "Status"
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('yalla_language');
    return (saved === 'en' || saved === 'ar' || saved === 'zh') ? saved : 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('yalla_language', lang);
  };

  useEffect(() => {
    // Dynamically update document layout direction and language code
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (arText: string, enFallback?: string): string => {
    if (language === 'ar') return arText;

    if (language === 'zh') {
      const cleanedKey = arText.trim();
      // 1. Direct match with Arabic key
      if (chineseDictionary[cleanedKey]) {
        return chineseDictionary[cleanedKey];
      }
      // 2. Direct match with English fallback if provided
      if (enFallback !== undefined) {
        const cleanedEn = enFallback.trim();
        if (chineseDictionary[cleanedEn]) {
          return chineseDictionary[cleanedEn];
        }
        return translateEnToZh(enFallback);
      }
      // 3. Use global dictionary or dynamic parsing to resolve English first, then translate
      const enText = globalDictionary[cleanedKey] || translateDynamicArabic(arText);
      const cleanedEn = enText.trim();
      if (chineseDictionary[cleanedEn]) {
        return chineseDictionary[cleanedEn];
      }
      return translateEnToZh(enText);
    }


    // Check if we have an explicit fallback passed first
    if (enFallback !== undefined) return enFallback;

    // Check custom translated string from global dictionary
    const cleanedKey = arText.trim();
    if (globalDictionary[cleanedKey]) {
      return globalDictionary[cleanedKey];
    }

    // Call dynamic Arabic translation helper
    return translateDynamicArabic(arText);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Dynamic helper translating system notifications, custom item grants & titles dynamically.
export const translateDynamicArabic = (arText: string): string => {
  if (!arText) return arText;
  const trimmed = arText.trim();

  // Simple translations list
  const dictionary: Record<string, string> = {
    "هدية من الإدارة! 🎁": "Gift from Administration! 🎁",
    "هدية خاصة من الإدارة": "Special Gift from Administration",
    "تحديث غلاف الغرفة": "Room Cover Updated",
    "صورة متحركة مميزة": "Special Animated Avatar",
    "تم شحن محفظتك": "Wallet Recharged",
    "تم سحب رصيد": "Coins Deducted",
    "تهنئة بالهوية الجديدة": "Congratulations on Your New ID!",
    "تم منحك صلاحية جديدة": "New Privilege Granted",
    "تنبيه إداري": "Administrative Alert",
    "وكالة الشحن": "Shipping Agency Onboarding",
    "سحب الوكالة": "Agency Privileges Revoked",
    "شحن محفظة الوكالة": "Agency Wallet Recharge",
    "سحب من محفظة الوكالة": "Withdrawn from Agency Wallet",
    "⚠️ تنبيه هام بخصوص غرفتك": "⚠️ Important Notice Regarding Your Room",
    "طلب ارتباط (CP)": "Couple Relationship Request (CP)",
    "انفصال وتعويض": "Decoupled & Compensated",
    "تهانينا!": "Congratulations!",
    "تنبيه": "Alert",
  };

  if (dictionary[trimmed]) return dictionary[trimmed];

  // Store item names
  const itemNames: Record<string, string> = {
    "إطار النجوم": "Starry Frame",
    "إطار ذهبي": "Golden Frame",
    "تنين اللورد": "Lord's Dragon Entry",
    "سيارة رياضية": "Sports Car Entry",
    "برق ورعد": "Lightning Storm Entry",
    "خلفية ديسكو": "Disco Party Background",
    "خلفية هادئة": "Calm Lounge Background",
    "إطار ملكي": "Royal Crown Frame",
    "إطار الورد": "Rose Frame",
    "دخول الأبطال": "Champions Entry",
    "دخولية الملك": "Royal Entry",
    "خلفية الفضاء": "Outer Space Background",
    "عنصر": "Store Item",
    "غلاف متحرك": "Animated Room Cover",
    "إطار": "Frame",
    "دخولية": "Room Entry",
    "خلفية": "Background"
  };

  if (itemNames[trimmed]) return itemNames[trimmed];

  const translateItemName = (name: string): string => {
    return itemNames[name.trim()] || name;
  };

  // Regex rules
  const rules = [
    {
      regex: /تهانينا!\s+تم\s+شحن\s+([\d,]+)\s+كوينز\s+لك\s+من\s+ثروة\s+البار\s+الخاصة\s+بـ\s*"(.*?)"\./,
      replace: (_: string, coins: string, owner: string) => {
        return `Congratulations! You received ${coins} coins from the bar wealth of "${owner}".`;
      }
    },
    // 1. GiveItemsModal / AdminPanel frames & items grant
    {
      regex: /مبروك!\s+لقد\s+حصلت\s+على\s+(إطار|دخولية|خلفية|عنصر)\s*\((.*?)\)\s*لمدة\s*(\d+)\s*أيام\.\s*تفقدها\s*الآن\s*في\s*حقيبتك\s*في\s*المتجر\./,
      replace: (_: string, type: string, name: string, days: string) => {
        const typeEn: Record<string, string> = { "إطار": "frame", "دخولية": "room entry", "خلفية": "room background", "عنصر": "item" };
        const englishItemName = translateItemName(name);
        return `Congratulations! You received a premium ${typeEn[type] || 'item'} (${englishItemName}) for ${days} days. Check it now in your Bag in the Store.`;
      }
    },
    {
      regex: /لقد\s+منحتك\s+الإدارة\s+إطاراً\s+مميزة\s+باسم\s*"(.*?)"\s*لمدة\s*(\d+)\s*أيام\.\s*تفقدها\s*الآن\s*في\s*إعدادات\s*المتجر!/,
      replace: (_: string, name: string, days: string) => {
        return `The Administration has granted you a special frame named "${translateItemName(name)}" for ${days} days. Check it now in your store settings!`;
      }
    },
    {
      regex: /لقد\s+منحتك\s+الإدارة\s+خلفية\s+غرفه\s+مخصصة\s+باسم\s*"(.*?)"\s*لمدة\s*(\d+)\s*أيام\.\s*تفقدها\s*الآن\s*في\s*إعدادات\s*الغرفة!/,
      replace: (_: string, name: string, days: string) => {
        return `The Administration has granted you a custom room theme/background named "${translateItemName(name)}" for ${days} days. Check it now in your voice room settings!`;
      }
    },
    {
      regex: /لقد\s+تم\s+منحك\s+صوره\s+متحركه\s+مميزة\s+لبروفايلك\s+من\s+قبل\s+الإدارة!\s+استمتع\s+بمظهرك\s+الجديد\./,
      replace: () => "The Administration has granted your profile an awesome animated profile photo! Enjoy your new custom look."
    },
    {
      regex: /لقد\s+قامت\s+الإدارة\s+بمنح\s+غرفتك\s*"(.*?)"\s*غلافاً\s+متحركاً\s+مميزاً\s+وحصرياً\.\s*تفقد\s*مظهر\s*غرفتك\s*الجديد\s*الآن!/,
      replace: (_: string, titleName: string) => {
        return `The Administration has gifted your room "${titleName}" an exclusive premium animated cover logo. See your channel's fresh style now!`;
      }
    },
    {
      regex: /تم\s+شحن\s+([\d,]+)\s+كوينز\s+لك\s+من\s+قبل\s+الإدارة\.\s*استمتع\s+بالألعاب!/,
      replace: (_: string, amount: string) => {
        return `${amount} Gold Coins have been recharged to your account by the Administration. Enjoy!`;
      }
    },
    {
      regex: /تم\s+سحب\s+([\d,]+)\s+كوينز\s+من\s+حسابك\s+من\s+قبل\s+الإدارة\./,
      replace: (_: string, amount: string) => {
        return `${amount} Gold Coins have been debited from your account by the Administration.`;
      }
    },
    {
      regex: /مبروك\s+تم\s+حصولك\s+على\s+ID\s+مميز\s+وحصري\s+من\s+الإدارة\.\s+رقم\s+هويتك\s+الجديد\s+هو:\s*(\w+)/,
      replace: (_: string, newId: string) => {
        return `Congratulations! You received an exclusive unique ID from the Administration. Your new ID is: ${newId}`;
      }
    },
    {
      regex: /لقد\s+تم\s+منحك\s+الوصول\s+إلى\s+نظام\s+حظر\s+المستخدمين\.\s+يمكنك\s+الآن\s+العثور\s+عليه\s+في\s+ملفك\s+الشخصي\./,
      replace: () => "You have been authorized to use the User Ban System. Access privileges are active; find it in your profile menu now."
    },
    {
      regex: /تم\s+سحب\s+نظام\s+حظر\s+المستخدمين\s+من\s+الحساب\s+بسبب\s+المخالفه\s+للقوانين/,
      replace: () => "The User Ban System access was revoked from your account due to rules violations."
    },
    {
      regex: /لقد\s+تم\s+منحك\s+الوصول\s+إلى\s+نظام\s+المدير\s+العام\.\s+يمكنك\s+الآن\s+العثور\s+عليه\s+في\s+ملفك\s+الشخصي\./,
      replace: () => "Congratulations! You have been granted full permissions for the General Manager Panel. Open your profile menu to configure and manage."
    },
    {
      regex: /تم\s+سحب\s+نظام\s+المدير\s+العام\s+من\s+الحساب\s+بسبب\s+المخالفه\s+للقوانين/,
      replace: () => "Access to the General Manager Panel has been revoked from this account due to guideline violations."
    },
    {
      regex: /تنبيه\s+لقد\s+تلقينا\s+بلاغات\s+عديده\s+على\s+غرفتك\s+في\s+الفتره\s+الحاليه\s+برجاء\s+الالتزام\s+بقواعد\s+المجتمع\s+وإلا\s+سيتم\s+حظر\s+الحساب\s+وتجميد\s+الغرفه\s+نتمني\s+لكم\s+الاستمتاع\s+بلحظاتكم\s+المميزه\s+هنا/,
      replace: () => "Warning: We have received multiple reports against your voice room recently. Please adhere strictly to user safety guidelines, otherwise your account may be banned and your room suspended. We hope you enjoy your special highlights here."
    },
    {
      regex: /تهانينا\s+حصلت\s+على\s+نظام\s+شحن\s+للمستخدمين\s+اصبحت\s+الان\s+وكيل\s+شحن\s+معتمد\s+لدينا\s+وحصلت\s+على\s+رصيد\s+ترحيبي\s+([\d,]+)\s+ذهب/,
      replace: (_: string, coins: string) => {
        return `Congratulations! You received the user shipping panel and became an authorized agent with a welcome balance of ${coins} Gold.`;
      }
    },
    {
      regex: /نأسف\s+لإبلاغك\s+بأنه\s+تم\s+سحب\s+صلاحيات\s+وكالة\s+الشحن\s+من\s+حسابك\s+الرسمي/,
      replace: () => "We regret to inform you that the Shipping Agency credentials have been revoked from your official account."
    },
    {
      regex: /تم\s+إضافة\s+([\d,]+)\s+رصيد\s+في\s+محفظة\s+الوكالة\s+الخاصة\s+بك\s+من\s+قبل\s+الإدارة/,
      replace: (_: string, amount: string) => {
        return `A balance of ${amount} credits was added to your Shipping Agency wallet by the Administration.`;
      }
    },
    {
      regex: /تم\s+سحب\s+([\d,]+)\s+رصيد\s+من\s+محفظة\s+الوكالة\s+الخاصة\s+بك\s+من\s+قبل\s+الإدارة/,
      replace: (_: string, amount: string) => {
        return `A balance of ${amount} credits was deducted from your Shipping Agency wallet by the Administration.`;
      }
    },
    {
      regex: /تقدم\s*(.*?)\s*بربط\s+علاقة\s+معك/,
      replace: (_: string, name: string) => `${name} proposed to pair / bond CP relationship with you.`
    },
    {
      regex: /الشريك\s+الآخر\s+قام\s+بفك\s+العلاقة\s+وقام\s+بتعويضك\s+بمبلغ\s+([\d,]+)\s+عملة\s+ذهبية/,
      replace: (_: string, amount: string) => `The other partner dissolved the CP link and compensated you with ${amount} Gold Coins.`
    },
    {
      regex: /تهانينا\s+قمت\s+بإعادة\s+الشحن\s+([\d,]+)\s+كوينز\s+من\s+وكيل\s+شحن\s*\((.*?)\)\s*\(ID_(\w+)\)/,
      replace: (_: string, coins: string, name: string, id: string) => {
        return `Congratulations! You have successfully recharged ${coins} Coins from Shipping Agent (${name}) (ID_${id})`;
      }
    }
  ];

  for (const item of rules) {
    if (item.regex.test(trimmed)) {
      return trimmed.replace(item.regex, item.replace as any);
    }
  }

  // Fallback for item names or partial phrases.
  if (trimmed.includes("مبروك") || trimmed.includes("تهانينا")) {
    return trimmed
      .replace(/مبروك/g, "Congratulations")
      .replace(/تهانينا/g, "Congratulations")
      .replace(/لقد حصلت على/g, "you have received")
      .replace(/لمدة/g, "for")
      .replace(/أيام/g, "days")
      .replace(/تفقدها الآن في حقيبتك في المتجر/g, "Check it now in your Store inventory!");
  }

  return arText;
};

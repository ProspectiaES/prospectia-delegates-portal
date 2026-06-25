export function buildDefaultReactivationEmail(clientName: string, delegateName: string): string {
  const firstName = clientName.trim().split(/\s+/)[0] || clientName;
  return `Hola ${firstName},

Hace tiempo que no tenemos noticias tuyas y nos gustaría saber cómo te ha ido con tu pedido anterior.

Si necesitas reponer producto, tienes alguna duda o simplemente quieres ponerte al día, aquí estamos para ayudarte.

Un saludo,
${delegateName}`;
}

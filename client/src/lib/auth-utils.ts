export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Sitzung abgelaufen",
      description: "Bitte melden Sie sich erneut an.",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/";
  }, 500);
}

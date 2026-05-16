import { WorkingHoursClient } from "./working-hours-client";

/**
 * Server component que renderiza apenas o wrapper client.
 * Quando Auth chegar, esse server component vai poder carregar o valor
 * persistido no Chatwoot via proxy e passar como prop inicial — mas por
 * enquanto fica vazio e o client lê localStorage.
 */
export default function WorkingHoursSettingsPage() {
  return <WorkingHoursClient />;
}

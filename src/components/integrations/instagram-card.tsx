import { Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "./status-pill";

export function InstagramCard() {
  return (
    <Card data-testid="instagram-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera aria-hidden="true" className="h-4 w-4 text-pink-600" />
          Instagram
        </CardTitle>
        <StatusPill level="unavailable" />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Disponível na fase 2</p>
      </CardContent>
    </Card>
  );
}

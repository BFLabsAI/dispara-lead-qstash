"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Disparador } from "@/components/Disparador";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <img
            src="https://i.ibb.co/8WjsnNk/dispara_lead.png"
            alt="DisparaLead Logo"
            className="mx-auto mb-4 h-12"
          />
          <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
            DISPARADOR INTELIGENTE
          </h1>
        </div>
        <Tabs defaultValue="disparador" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="disparador" className="justify-center">
              <i className="bi bi-send-fill mr-2"></i>Disparador
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="justify-center">
              <i className="bi bi-bar-chart-line-fill mr-2"></i>Dashboard
            </TabsTrigger>
          </TabsList>
          <TabsContent value="disparador" className="space-y-6">
            <Disparador />
          </TabsContent>
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
        </Tabs>
        <Card className="mt-8 border-0">
          <CardContent className="py-4">
            <MadeWithDyad />
            <p className="text-center text-sm text-muted-foreground mt-2">Desenvolvido por BF Labs 🔬</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
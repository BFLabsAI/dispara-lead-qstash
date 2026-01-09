
import { useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatDetails } from "@/components/chat/ChatDetails";

import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function ChatsPage() {
    const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
    const [selectedContact, setSelectedContact] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Trigger to force sidebar refresh when details change
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // When instance changes, might clear selected contact?
    const handleSelectInstance = (instance: string) => {
        setSelectedInstance(instance);
        setSelectedContact(null);
    };

    const handleContactUpdate = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-lg border bg-background shadow-sm">
            <ChatSidebar
                selectedInstance={selectedInstance}
                onSelectInstance={handleSelectInstance}
                selectedContact={selectedContact}
                onSelectContact={setSelectedContact}
                refreshTrigger={refreshTrigger}
            />
            <ChatWindow
                selectedInstance={selectedInstance}
                selectedContact={selectedContact}
                onToggleDetails={() => setIsDetailsOpen(true)}
            />

            {/* Desktop Details */}
            {selectedContact && (
                <ChatDetails
                    selectedContact={selectedContact}
                    className="hidden xl:flex"
                    onUpdate={handleContactUpdate}
                />
            )}

            {/* Mobile/Tablet Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="p-0 sm:max-w-sm w-[300px]">
                    {selectedContact && (
                        <ChatDetails
                            selectedContact={selectedContact}
                            className="w-full border-0 h-full"
                            onUpdate={handleContactUpdate}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

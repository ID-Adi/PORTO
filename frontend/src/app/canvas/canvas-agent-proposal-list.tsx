"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  ProposalChange,
  ProposalRow,
  ProposalStatus,
} from "./canvas-agent-types";

function ProposalItem({
  proposal,
  busy,
  onStatus,
  onApply,
}: {
  proposal: ProposalRow;
  busy: boolean;
  onStatus: (status: ProposalStatus) => void;
  onApply: () => void;
}) {
  const changes = (proposal.changes ?? []) as ProposalChange[];
  return (
    <div className="canvas-agent-proposal">
      <div className="canvas-agent-proposal-head">
        <div>
          <span className="canvas-agent-section-kicker">proposal</span>
          <h4>{proposal.summary}</h4>
        </div>
        <span className="canvas-agent-status-pill">{proposal.status}</span>
      </div>
      <p>
        {proposal.frameIds.length} frame linked / {changes.length} change
      </p>
      <div className="canvas-agent-proposal-actions">
        {proposal.status === "pending_approval" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onStatus("approved")}
            >
              <Check aria-hidden />
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onStatus("rejected")}
            >
              <X aria-hidden />
              Reject
            </Button>
          </>
        ) : null}
        {proposal.status === "approved" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onApply}
          >
            <Check aria-hidden />
            Apply
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function CanvasAgentProposalList({
  proposals,
  busy,
  onStatus,
  onApply,
}: {
  proposals: ProposalRow[];
  busy: boolean;
  onStatus: (proposal: ProposalRow, status: ProposalStatus) => void;
  onApply: (proposal: ProposalRow) => void;
}) {
  if (proposals.length === 0) return null;

  return (
    <div className="canvas-agent-proposals">
      {proposals.map((proposal) => (
        <ProposalItem
          key={proposal.id}
          proposal={proposal}
          busy={busy}
          onStatus={(status) => onStatus(proposal, status)}
          onApply={() => onApply(proposal)}
        />
      ))}
    </div>
  );
}

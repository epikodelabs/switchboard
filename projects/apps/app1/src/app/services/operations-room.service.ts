import {
  Injectable,
  signal,
} from '@angular/core';

export interface OperatorProfile {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly callsign: string;
}

export interface MissionRecord {
  readonly id: number;
  readonly codeName: string;
  readonly sector: string;
  readonly headline: string;
  readonly risk: 'stable' | 'watch' | 'critical';
}

export interface MissionSnapshot {
  readonly missionId: number;
  readonly codeName: string;
  readonly sector: string;
  readonly headline: string;
  readonly risk: MissionRecord['risk'];
  readonly operatorName: string;
  readonly operatorTitle: string;
  readonly routeWindow: string;
  readonly recommendedLens: string;
  readonly anomalyBand: string;
  readonly nextMissionId: number;
}

export interface AnalysisSnapshot {
  readonly missionId: number;
  readonly codeName: string;
  readonly lens: string;
  readonly confidence: string;
  readonly drift: string;
  readonly actionWindow: string;
  readonly hotSpots: readonly string[];
  readonly recommendedNote: string;
}

export interface HandoffPacket {
  readonly packetId: string;
  readonly missionId: number;
  readonly codeName: string;
  readonly originFrame: 'mission' | 'analysis';
  readonly channel: string;
  readonly note: string;
  readonly operatorCallsign: string;
  readonly operatorName: string;
  readonly returnDetail: number;
}

export interface DebriefSummary {
  readonly missionId: number;
  readonly codeName: string;
  readonly packetId: string;
  readonly originFrame: HandoffPacket['originFrame'];
  readonly channel: string;
  readonly note: string;
  readonly operatorName: string;
  readonly readiness: string;
  readonly nextMove: string;
}

const operators = Object.freeze([
  {
    id: 'iris',
    name: 'Iris Sol',
    title: 'Mission Conductor',
    callsign: 'Northlight',
  },
  {
    id: 'toma',
    name: 'Toma Venn',
    title: 'Signal Cartographer',
    callsign: 'Backscatter',
  },
  {
    id: 'sana',
    name: 'Sana Vale',
    title: 'Recovery Planner',
    callsign: 'Third Rail',
  },
] satisfies readonly OperatorProfile[]);

const missions = Object.freeze([
  {
    id: 207,
    codeName: 'Aurora Fold',
    sector: 'Helix Coast',
    headline: 'Transient storm cells are masking the primary recovery lane.',
    risk: 'watch',
  },
  {
    id: 315,
    codeName: 'Glass Harbor',
    sector: 'Delta Shelf',
    headline: 'Cargo relays are drifting outside the expected beacon corridor.',
    risk: 'stable',
  },
  {
    id: 412,
    codeName: 'Slate Orchard',
    sector: 'Meridian Ridge',
    headline: 'Thermal scatter suggests an unplanned convoy split.',
    risk: 'critical',
  },
] satisfies readonly MissionRecord[]);

@Injectable({
  providedIn: 'root',
})
export class OperationsRoomService {
  readonly operators = operators;
  readonly missions = missions;
  readonly currentOperatorId = signal(operators[0].id);
  readonly eventFeed = signal<readonly string[]>([
    'Frame graph ready. Internal handoff remains address-optional.',
  ]);

  private packetCounter = 18;

  currentOperator(): OperatorProfile {
    return this.operators.find(
      operator => operator.id === this.currentOperatorId(),
    ) ?? this.operators[0];
  }

  selectOperator(operatorId: string): void {
    const nextOperator = this.operators.find(
      operator => operator.id === operatorId,
    );

    if (!nextOperator) {
      return;
    }

    this.currentOperatorId.set(nextOperator.id);
    this.log(`Console shifted to ${nextOperator.callsign}.`);
  }

  async prepareMission(
    missionId: number,
    lane: string,
    zoom: number,
  ): Promise<MissionSnapshot> {
    const mission = this.findMission(missionId);
    const operator = this.currentOperator();

    await this.delay(this.pace(missionId, 260));

    const nextMission =
      this.missions[
        (this.missions.findIndex(item => item.id === mission.id) + 1)
        % this.missions.length
      ];

    const snapshot: MissionSnapshot = {
      missionId: mission.id,
      codeName: mission.codeName,
      sector: mission.sector,
      headline: mission.headline,
      risk: mission.risk,
      operatorName: operator.name,
      operatorTitle: operator.title,
      routeWindow: `${lane.toUpperCase()} lane, zoom ${zoom}`,
      recommendedLens: lane === 'thermal' ? 'echo' : 'thermal',
      anomalyBand:
        mission.risk === 'critical'
          ? 'high disturbance'
          : mission.risk === 'watch'
            ? 'medium disturbance'
            : 'low disturbance',
      nextMissionId: nextMission.id,
    };

    this.log(`Mission ${mission.id} prepared for ${operator.callsign}.`);
    return snapshot;
  }

  async prepareAnalysis(
    missionId: number,
    lens: string,
    detail: number,
  ): Promise<AnalysisSnapshot> {
    const mission = this.findMission(missionId);

    await this.delay(this.pace(missionId, 360));

    const snapshot: AnalysisSnapshot = {
      missionId: mission.id,
      codeName: mission.codeName,
      lens,
      confidence: `${88 + (missionId % 7)}%`,
      drift: `${2 + detail}.${missionId % 10} km`,
      actionWindow: `${18 + detail} minutes`,
      hotSpots: Object.freeze([
        `${lens} ridge`,
        'relay pocket',
        mission.risk === 'critical' ? 'convoy split' : 'signal seam',
      ]),
      recommendedNote:
        mission.risk === 'critical'
          ? 'Escalate through silent handoff before public debrief.'
          : 'Hold frame, then commit a handoff packet.',
    };

    this.log(`Analysis ${mission.id} rendered with ${lens} lens.`);
    return snapshot;
  }

  createHandoffPacket(input: {
    readonly missionId: number;
    readonly originFrame: HandoffPacket['originFrame'];
    readonly channel: string;
    readonly note: string;
    readonly returnDetail: number;
  }): HandoffPacket {
    const mission = this.findMission(input.missionId);
    const operator = this.currentOperator();
    this.packetCounter += 1;

    const packet: HandoffPacket = {
      packetId: `HX-${this.packetCounter}`,
      missionId: mission.id,
      codeName: mission.codeName,
      originFrame: input.originFrame,
      channel: input.channel,
      note: input.note,
      operatorCallsign: operator.callsign,
      operatorName: operator.name,
      returnDetail: input.returnDetail,
    };

    this.log(`Packet ${packet.packetId} opened from ${packet.originFrame}.`);
    return packet;
  }

  async hydrateHandoff(
    payload: unknown,
  ): Promise<HandoffPacket> {
    await this.delay(340);

    const fallback = this.createHandoffPacket({
      missionId: this.missions[0].id,
      originFrame: 'mission',
      channel: 'thermal',
      note: 'Fallback packet synthesized after missing payload.',
      returnDetail: 2,
    });

    if (!this.isHandoffPacket(payload)) {
      this.log(`Fallback packet ${fallback.packetId} restored in handoff.`);
      return fallback;
    }

    this.log(`Packet ${payload.packetId} hydrated inside internal handoff.`);
    return payload;
  }

  async prepareDebrief(
    missionId: number,
    payload: unknown,
  ): Promise<DebriefSummary> {
    await this.delay(this.pace(missionId, 420));

    const packet =
      this.isHandoffPacket(payload)
        ? payload
        : this.createHandoffPacket({
            missionId,
            originFrame: 'mission',
            channel: 'thermal',
            note: 'Debrief opened without packet history.',
            returnDetail: 2,
          });

    const mission = this.findMission(packet.missionId);
    const readiness =
      mission.risk === 'critical'
        ? 'Priority review in progress'
        : mission.risk === 'watch'
          ? 'Queued for monitored release'
          : 'Ready for calm release';

    const summary: DebriefSummary = {
      missionId: packet.missionId,
      codeName: mission.codeName,
      packetId: packet.packetId,
      originFrame: packet.originFrame,
      channel: packet.channel,
      note: packet.note,
      operatorName: packet.operatorName,
      readiness,
      nextMove:
        packet.originFrame === 'analysis'
          ? 'Return to mission board with the new lens locked in.'
          : 'Stay on the mission board and confirm release timing.',
    };

    this.log(`Debrief ${packet.packetId} committed for mission ${mission.id}.`);
    return summary;
  }

  private findMission(
    missionId: number,
  ): MissionRecord {
    return this.missions.find(
      mission => mission.id === missionId,
    ) ?? this.missions[0];
  }

  private pace(
    missionId: number,
    floor: number,
  ): number {
    return floor + (missionId % 3) * 110;
  }

  private delay(
    durationMs: number,
  ): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }

  private log(
    message: string,
  ): void {
    this.eventFeed.update(events => [
      message,
      ...events,
    ].slice(0, 6));
  }

  private isHandoffPacket(
    value: unknown,
  ): value is HandoffPacket {
    return typeof value === 'object'
      && value !== null
      && 'packetId' in value
      && 'missionId' in value
      && 'originFrame' in value;
  }
}


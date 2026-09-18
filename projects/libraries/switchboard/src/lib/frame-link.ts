import {
  DOCUMENT,
} from '@angular/common';

import {
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  inject,
} from '@angular/core';

import {
  getRouterLocation as getNavigationLocation,
} from './router-url';

import {
  watchFrameLocation,
} from './adapter-utils';

import type { FrameAddress, PathAddress } from './frame-runtime';

import { FrameRuntime } from './frame-runtime';
import { Relay, type RelayTarget } from './frame-relay';

type FrameLinkCommands =
  readonly unknown[];

type FrameLinkInput =
  | FrameAddress
  | RelayTarget
  | FrameLinkCommands
  | null
  | undefined;

function buildPathFromCommands(
  commands: FrameLinkCommands,
): string {
  if (commands.length === 0) {
    return '';
  }

  let path = '';

  for (const command of commands) {
    if (command === null || command === undefined) {
      continue;
    }

    const segment =
      String(command).trim();

    if (!segment) {
      continue;
    }

    if (!path) {
      path = segment;
      continue;
    }

    path =
      `${path.replace(/\/+$/, '')}/${segment.replace(/^\/+/, '')}`;
  }

  return path;
}

function appendQueryParams(
  url: URL,
  queryParams:
    Readonly<Record<string, unknown>>,
): void {
  url.search = '';

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === null || entry === undefined) {
          continue;
        }

        url.searchParams.append(key, String(entry));
      }

      continue;
    }

    url.searchParams.set(key, String(value));
  }
}

@Directive({
  selector: 'a[frameLink],area[frameLink]',
  standalone: true,
})
export class FrameLink implements OnChanges {
  private readonly relay = inject(Relay, { optional: true });
  private readonly runtime = inject(FrameRuntime);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject(
    ElementRef<HTMLAnchorElement | HTMLAreaElement>,
  ).nativeElement;

  @Input() frameLink: FrameLinkInput;
  @Input() queryParams:
    Readonly<Record<string, unknown>> |
    null |
    undefined;
  @Input() fragment: string | null | undefined;
  @Input() state: unknown;
  @Input() replaceUrl = false;

  @HostBinding('attr.href')
  href: string | null = null;

  constructor() {
    watchFrameLocation(
      this.destroyRef,
      () => this.refreshHref(),
    );
  }

  ngOnChanges(): void {
    this.refreshHref();
  }

  @HostListener('click', ['$event'])
  async handleClick(event: Event): Promise<void> {
    if (!(event instanceof MouseEvent)) {
      return;
    }

    if (!this.href) {
      return;
    }

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (
      this.element.target &&
      this.element.target !== '_self'
    ) {
      return;
    }

    if (
      this.element.hasAttribute('download') ||
      this.element.rel
        .split(/\s+/)
        .includes('external')
    ) {
      return;
    }

    event.preventDefault();

    try {
      const options = {
        replace: this.replaceUrl,
        state: this.state,
      };
      const target = this.resolveTarget();
      if (!target) {
        return;
      }

      if (this.isRelayTarget(target) && this.relay?.resolve(target)) {
        await this.relay.to(target, options);
        return;
      }

      if (this.isRelayTarget(target)) {
        return;
      }

      await this.runtime.navigate(target, options);
    } catch {
      // Router state already records the actionable navigation error. The DOM
      // click contract is still best-effort, so keep the failure local here.
    }
  }

  private refreshHref(): void {
    const target =
      this.resolveTarget();

    if (!target) {
      this.href = null;
      return;
    }

    const href = this.isRelayTarget(target)
      ? this.relay?.href(target, {
          query: this.queryParams ?? undefined,
          state: this.state,
          replace: this.replaceUrl,
        }) ?? null
      : this.runtime.href(target);

    if (!href) {
      this.href = null;
      return;
    }

    if (this.fragment === undefined) {
      this.href = href;
      return;
    }

    const url =
      new URL(
        href,
        getNavigationLocation(this.document).origin,
      );

    if (this.fragment !== undefined) {
      url.hash = this.fragment
        ? `#${this.fragment.replace(/^#/, '')}`
        : '';
    }

    this.href =
      `${url.pathname}${url.search}${url.hash}`;
  }

  private resolveTarget():
    FrameAddress | RelayTarget | null {
    const link =
      this.frameLink;

    if (link === null || link === undefined) {
      return null;
    }

    if (Array.isArray(link)) {
      return this.withQueryParams({
        path: buildPathFromCommands(link),
      });
    }

    if (
      typeof link === 'string' ||
      link instanceof URL
    ) {
      return this.withQueryParams(
        link,
      );
    }

    if (this.isRelayTarget(link)) {
      return link;
    }

    if ('name' in link) {
      return {
        ...link,
        query:
          this.queryParams
            ? {
                ...(link.query ?? {}),
                ...this.queryParams,
              }
            : link.query,
      };
    }

    return this.withQueryParams(
      link as PathAddress,
    );
  }

  private withQueryParams(
    target:
      string |
      URL |
      PathAddress,
  ): FrameAddress {
    if (!this.queryParams) {
      return target;
    }

    const href =
      typeof target === 'string'
        ? target
        : target instanceof URL
          ? target.href
          : target.path;

    const url =
      new URL(
        href,
        getNavigationLocation(this.document).href,
      );

    appendQueryParams(
      url,
      this.queryParams,
    );

    if (this.fragment !== undefined) {
      url.hash = this.fragment
        ? `#${this.fragment.replace(/^#/, '')}`
        : '';
    }

    return {
      path:
        `${url.pathname}${url.search}${url.hash}`,
    };
  }

  private isRelayTarget(target: unknown): target is RelayTarget {
    return typeof target === 'object'
      && target !== null
      && 'kind' in target
      && target.kind === 'frame'
      && 'id' in target
      && typeof target.id === 'string';
  }
}

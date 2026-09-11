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
  getNavigationLocation,
} from './navigation-url';

import {
  watchFrameLocation,
} from './adapter-utils';

import type {
  NavigationTarget,
  PathNavigationTarget,
} from './navigation-targets';

import { FrameNavigator } from './frame-navigator';
import { Relay } from './frame-relay';

type FrameLinkCommands =
  readonly unknown[];

type FrameLinkInput =
  | NavigationTarget
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
  private readonly router = inject(FrameNavigator);
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

      // Keep the authored target intact. Converting a named/frame target to its
      // href before relaying loses its peer identity (and breaks redirects and
      // companion-outlet links). A Relay handles the target only when its
      // current frame network can resolve it; URL/external ingress remains a
      // valid fallback while the compatibility navigator exists.
      if (this.relay?.resolve(target)) {
        await this.relay.to(target, options);
      } else {
        await this.router.navigate(target, options);
      }
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

    // href generation is not transition execution. A peer may be rendered in
    // a companion outlet and still legitimately address a URL that enters the
    // frame network through browser/navigation ingress (redirects are the
    // obvious example). Prefer Relay when it resolves locally, but never make
    // an anchor disappear merely because this peer cannot currently accept the
    // handoff itself.
    const href = this.relay?.href(target) ?? this.router.href(target);

    if (!href) {
      this.href = null;
      return;
    }

    if (
      !this.queryParams &&
      this.fragment === undefined
    ) {
      this.href = href;
      return;
    }

    const url =
      new URL(
        href,
        getNavigationLocation(this.document).origin,
      );

    if (this.queryParams) {
      appendQueryParams(
        url,
        this.queryParams,
      );
    }

    if (this.fragment !== undefined) {
      url.hash = this.fragment
        ? `#${this.fragment.replace(/^#/, '')}`
        : '';
    }

    this.href =
      `${url.pathname}${url.search}${url.hash}`;
  }

  private resolveTarget():
    NavigationTarget | null {
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
      link as PathNavigationTarget,
    );
  }

  private withQueryParams(
    target:
      string |
      URL |
      PathNavigationTarget,
  ): NavigationTarget {
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
}
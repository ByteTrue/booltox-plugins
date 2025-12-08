/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

declare module 'booltox-backend' {
  export class BooltoxBackend {
    constructor();
    on(method: string, handler: (params: any) => any): void;
    notify(method: string, params?: any): void;
    emit(event: string, data?: any): void;
    method(name: string, handler: (params?: any) => any | Promise<any>): void;
    run(): void;
    start(): void;
  }
}

export type State = {
   enabled: boolean;
   lockConfiguration?: {
      password?: {
         secret: string;
      };
      timer?: {
         endTime: number;
      };
      timerPlus?: {
         timesPerLabel: Record<number, number>;
      };
      emergencyClientToken: string;
      startTime: number;
   };
   wblistConfiguration: {
      mode: "whitelist" | "blacklist";
      whitelist: { mode: "text" | "regex"; value: string }[];
      blacklist: { mode: "text" | "regex"; value: string }[];
   };
};

export type HasIndexSignature<T> = string extends keyof T
   ? true
   : number extends keyof T
     ? true
     : false;

type ReadOnlyShape<T extends object, A extends AccessFor<T>> = {
   [K in keyof T as K extends keyof A["entries"]
      ? A["entries"][K] extends {
           access: "noRead" | "noReadWrite";
        }
         ? never
         : K
      : K]: K extends keyof A["entries"]
      ? A["entries"][K] extends AccessFor<T[K]>
         ? ReadOnly<T[K], A["entries"][K]>
         : never
      : never;
};

type ReadOnly<T, A extends AccessFor<T>> =
   NonNullable<T> extends object
      ? HasIndexSignature<NonNullable<T>> extends true
         ? A["access"] extends "noRead" | "noReadWrite"
            ? never
            : T
         : ReadOnlyShape<NonNullable<T>, A>
      : A["access"] extends "noRead" | "noReadWrite"
        ? never
        : T;

type WriteOnlyShape<T extends object, A extends AccessFor<T>> = {
   [K in keyof T as K extends keyof A["entries"]
      ? A["entries"][K] extends {
           access: "noWrite" | "noReadWrite";
        }
         ? never
         : K
      : K]: K extends keyof A["entries"]
      ? A["entries"][K] extends AccessFor<T[K]>
         ? WriteOnly<T[K], A["entries"][K]>
         : never
      : never;
};

type WriteOnly<T, A extends AccessFor<T>> =
   NonNullable<T> extends object
      ? HasIndexSignature<NonNullable<T>> extends true
         ? A["access"] extends "noWrite" | "noReadWrite"
            ? never
            : T
         : WriteOnlyShape<NonNullable<T>, A>
      : A["access"] extends "noWrite" | "noReadWrite"
        ? never
        : T;

type PathOf<T, Prev extends string = ""> = {
   [K in keyof T]-?: NonNullable<T[K]> extends object
      ? HasIndexSignature<NonNullable<T[K]>> extends true
         ? `${Prev}${K & string}`
         :
              | `${Prev}${K & string}`
              | `${Prev}${K & string}.${PathOf<NonNullable<T[K]>, "">}`
      : `${Prev}${K & string}`;
}[keyof T];

type ValueOf<T, P extends string> = P extends `${infer Key}.${infer Rest}`
   ? Key extends keyof T
      ? ValueOf<NonNullable<T[Key]>, Rest>
      : never
   : P extends keyof T
     ? T[P]
     : never;

type ValueOfAccess<
   T extends AccessFor<object>,
   P extends string,
> = P extends `${infer K}.${infer Rest}`
   ? K extends keyof T["entries"]
      ? T["entries"][K] extends AccessFor<object>
         ? ValueOfAccess<T["entries"][K], Rest>
         : never
      : never
   : P extends keyof T["entries"]
     ? T["entries"][P]
     : never;

export type AccessFor<T> = {
   access: "noRead" | "noWrite" | "noReadWrite" | undefined;
} & (T extends object
   ? HasIndexSignature<T> extends false
      ? {
           entries: {
              [K in keyof T]-?: AccessFor<T[K]>;
           };
        }
      : {}
   : {});

const StateAccess = {
   access: undefined,
   entries: {
      enabled: {
         access: undefined,
      },
      lockConfiguration: {
         access: "noWrite",
         entries: {
            password: {
               access: undefined,
               entries: {
                  secret: {
                     access: "noRead",
                  },
               },
            },
            timer: {
               access: undefined,
               entries: {
                  endTime: {
                     access: undefined,
                  },
               },
            },
            timerPlus: {
               access: undefined,
               entries: {
                  timesPerLabel: {
                     access: undefined,
                  },
               },
            },
            emergencyClientToken: {
               access: "noWrite",
            },
            startTime: {
               access: "noWrite",
            },
         },
      },
      wblistConfiguration: {
         access: undefined,
         entries: {
            mode: {
               access: undefined,
            },
            whitelist: {
               access: undefined,
            },
            blacklist: {
               access: undefined,
            },
         },
      },
   },
} as const;

type StateAccess = typeof StateAccess;

type HasReadAccess<T, A extends AccessFor<T>> = A["access"] extends
   | "noRead"
   | "noReadWrite"
   ? false
   : true;

type HasWriteAccess<T, A extends AccessFor<T>> = A["access"] extends
   | "noWrite"
   | "noReadWrite"
   ? false
   : true;

type Path = PathOf<State>;

type ReadOnlyPathOf<
   T extends object,
   A extends AccessFor<T>,
   Prev extends string = "",
> = {
   [K in keyof T]-?: K extends keyof A["entries"]
      ? A["entries"][K] extends AccessFor<NonNullable<T[K]>>
         ?
              | (HasReadAccess<NonNullable<T[K]>, A["entries"][K]> extends true
                   ? `${Prev}${K & string}`
                   : never)
              | (NonNullable<T[K]> extends object
                   ? HasIndexSignature<NonNullable<T[K]>> extends false
                      ? `${Prev}${K & string}.${ReadOnlyPathOf<NonNullable<T[K]>, A["entries"][K], "">}`
                      : never
                   : never)
         : never
      : never;
}[keyof T];

type ReadOnlyPath = ReadOnlyPathOf<State, StateAccess>;


type WriteOnlyPathOf<
   T extends object,
   A extends AccessFor<T>,
   Prev extends string = "",
> = {
   [K in keyof T]-?: K extends keyof A["entries"]
      ? A["entries"][K] extends AccessFor<NonNullable<T[K]>>
         ?
              | (HasWriteAccess<NonNullable<T[K]>, A["entries"][K]> extends true
                   ? `${Prev}${K & string}`
                   : never)
              | (NonNullable<T[K]> extends object
                   ? HasIndexSignature<NonNullable<T[K]>> extends false
                      ? `${Prev}${K & string}.${WriteOnlyPathOf<NonNullable<T[K]>, A["entries"][K], "">}`
                      : never
                   : never)
         : never
      : never;
}[keyof T];

type WriteOnlyPath = WriteOnlyPathOf<State, StateAccess>;

type Value<P extends Path> = ValueOf<State, P>;

type ReadOnlyValue<P extends Path> =
   ValueOfAccess<StateAccess, P> extends AccessFor<ValueOf<State, P>>
      ? ReadOnly<ValueOf<State, P>, ValueOfAccess<StateAccess, P>>
      : never;

type WriteOnlyValue<P extends Path> =
   ValueOfAccess<StateAccess, P> extends AccessFor<ValueOf<State, P>>
      ? WriteOnly<ValueOf<State, P>, ValueOfAccess<StateAccess, P>>
      : never;

type GetQuery<P extends ReadOnlyPath> = {
   op: "get";
   path: P;
};

type AnyGetQuery = { [P in ReadOnlyPath]: GetQuery<P> }[ReadOnlyPath];

type SetQuery<P extends WriteOnlyPath> = {
   op: "set";
   path: P;
   value: WriteOnlyValue<P>;
};

type AnySetQuery = { [P in WriteOnlyPath]: SetQuery<P> }[WriteOnlyPath];

export type Query = AnyGetQuery | AnySetQuery;

export type QueryResult<Q> = Q extends { op: "get"; path: infer P }
   ? P extends ReadOnlyPath
      ? ReadOnlyValue<P>
      : never
   : undefined;

export type QueriesResult<Queries extends readonly Query[]> = {
   [K in keyof Queries]: QueryResult<Queries[K]>;
};

export function sendQueries<Queries extends readonly Query[]>(
   ...queries: Queries
): QueriesResult<Queries> {
   // TODO: Implement

   throw new Error("Not implemented");
}
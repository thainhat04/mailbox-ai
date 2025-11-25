# Hướng Dẫn Sử Dụng RTK Query, Custom Hooks & Data Fetching

Tài liệu này hướng dẫn cách sử dụng RTK Query, custom hooks, và các pattern phổ biến trong dự án này.

---

## 📋 Mục Lục

1. [RTK Query Setup](#rtk-query-setup)
2. [Tạo API Endpoints](#tạo-api-endpoints)
3. [Custom Hooks - useQueryHandler](#custom-hooks---useQueryHandler)
4. [Custom Hooks - useMutationHandler](#custom-hooks---useMutationHandler)
5. [useKeyboardNavigation Hook](#usekeyboardnavigation-hook)
6. [useInput Hook](#useinput-hook)
7. [Các Pattern &amp; Best Practices](#các-pattern--best-practices)
8. [useEffect &amp; Data Subscription](#useeffect--data-subscription)
9. [Error Handling](#error-handling)
10. [Caching &amp; Tag Invalidation](#caching--tag-invalidation)

---

## RTK Query Setup

### Cấu Trúc Cơ Bản

RTK Query được thiết lập trong `store/index.ts`:

```typescript
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { api } from "@/services";
import { rtkQueryErrorLogger } from "@/services/middleware/rtk-query-error-logger";

const store = configureStore({
    reducer: {
        theme: themeReducer,
        auth: authReducer,
        app: appReducer,
        language: languageReducer,
        [api.reducerPath]: api.reducer, // RTK Query reducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(api.middleware) // RTK Query middleware
            .concat(rtkQueryErrorLogger),
    devTools: process.env.NODE_ENV !== "production",
});
```

### BaseQuery với Interceptors

File: `services/baseQuery.ts`

- **Tự động thêm token**: Lấy từ `localStorage` và thêm vào header `Authorization`
- **Refresh token**: Tự động refresh token khi nhận 401 (Unauthorized)
- **Mutex lock**: Đảm bảo chỉ refresh token một lần nếu có nhiều request cùng bị 401

```typescript
const rawBaseQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem(SERVICES.accessToken);
        if (token) headers.set("authorization", `Bearer ${token}`);
        return headers;
    },
});
```

---

## Tạo API Endpoints

### Cấu Trúc API Service

Tạo một file mới trong `services/User/index.ts` (hoặc module khác):

```typescript
import { api } from "@/services";
import type { User } from "@/store/slice/auth.slice";
import { SuccessResponse } from "@/types/success-response";
import constants, { HTTP_METHOD } from "@/constants/services";

export const userApi = api.injectEndpoints({
    endpoints: (build) => ({
        // GET request
        getUser: build.query<SuccessResponse<User>, void>({
            query: () => ({
                url: constants.URL_GET_PROFILE,
                method: HTTP_METHOD.GET,
            }),
            // Tùy chọn:
            // providesTags: ["User"], // Dùng để invalidate cache
        }),

        // POST request với argument
        createUser: build.mutation<
            SuccessResponse<User>,
            { name: string; email: string }
        >({
            query: (payload) => ({
                url: constants.URL_CREATE_USER,
                method: HTTP_METHOD.POST,
                body: payload,
            }),
            // invalidatesTags: ["User"], // Invalidate cache khi thành công
        }),

        // PUT request - cập nhật
        updateUser: build.mutation<
            SuccessResponse<User>,
            { id: string; data: Partial<User> }
        >({
            query: ({ id, data }) => ({
                url: `${constants.URL_USER}/${id}`,
                method: HTTP_METHOD.PUT,
                body: data,
            }),
        }),

        // DELETE request
        deleteUser: build.mutation<SuccessResponse<void>, string>({
            query: (userId) => ({
                url: `${constants.URL_USER}/${userId}`,
                method: HTTP_METHOD.DELETE,
            }),
        }),
    }),
});

// Export hooks (RTK Query tự động tạo)
export const {
    useGetUserQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
} = userApi;
```

### Type Generics Giải Thích

```typescript
// Định dạng: build.query<ReturnType, ArgumentType>
build.query<SuccessResponse<User>, void>; // Không có argument
build.query<SuccessResponse<User>, string>; // Argument: string (userId)
build.query<SuccessResponse<User[]>, { limit: number; offset: number }>; // Argument: object

// Mutation tương tự
build.mutation<SuccessResponse<User>, CreateUserPayload>;
//               ↑ Return type           ↑ Argument type
```

---

## Custom Hooks - useQueryHandler

### Mục Đích

Wrap RTK Query hooks để:

- Trả về data đã xử lý (không cần `.data?.data`)
- Normalize error thành format consistent: `{ error: string, message: string }`
- Track loading/fetching state
- Có sẵn refetch function

### Cách Sử Dụng

```typescript
"use client";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetUserQuery } from "@/services/User";

export default function UserProfile() {
    // Cách 1: Không có argument
    const {
        result: user,
        error,
        isLoading,
        isFetching,
        refetch,
    } = useQueryHandler(useGetUserQuery, undefined);

    // Cách 2: Có argument
    const {
        result: userData,
        error,
        isLoading,
    } = useQueryHandler(useGetUserQuery, userId, {
        refetchOnFocus: true, // Tự động refetch khi focus
        refetchOnReconnect: true, // Refetch khi reconnect
        skip: !userId, // Bỏ qua query nếu userId undefined
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            <h1>{user?.name}</h1>
            <p>{user?.email}</p>
            <button onClick={() => refetch()}>Refresh</button>
        </div>
    );
}
```

### Return Object

```typescript
{
    result: T | null,           // Data đã được parse từ response
    error: {                    // Null nếu không có error
        error: string | null,   // Error code từ backend
        message: string | null  // Error message từ backend
    } | null,
    isLoading: boolean,         // True lần đầu tiên fetch
    isFetching: boolean,        // True lúc fetch (bao gồm refetch)
    refetch: () => void,        // Hàm để gọi lại request
    raw: QueryResult            // RTK Query result thô (nếu cần)
}
```

### Ví Dụ: Pagination

```typescript
const [page, setPage] = useState(1);

const {
    result: users,
    isLoading,
    refetch,
} = useQueryHandler(
    useGetUsersQuery,
    { limit: 10, offset: (page - 1) * 10 },
    { skip: false }
);

// Dependency của hook sẽ tự động trigger refetch khi page thay đổi
```

---

## Custom Hooks - useMutationHandler

### Mục Đích

Wrap RTK Query mutations để:

- Tự động handle loading/error state
- Có 2 version: `action` (không throw error) và `actionUnWrap` (throw error)
- Normalize error output
- Type-safe callbacks

### Cách Sử Dụng

```typescript
"use client";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useCreateUserMutation } from "@/services/User";

export default function CreateUserForm() {
    // Tên action sẽ được đặt tên động
    const {
        mutate, // Gọi mutation mà không throw error
        mutateUnWrap, // Gọi mutation và throw error nếu fail
        result, // Return value từ mutation
        error, // { error: string, message: string } | null
        isLoading, // Loading state
    } = useMutationHandler(useCreateUserMutation, "mutate");

    const handleSubmit = async (formData: CreateUserPayload) => {
        // Cách 1: Không throw error
        const result = await mutate(formData);
        if (result) {
            console.log("User created:", result);
        } else {
            console.log("Error:", error);
        }

        // Cách 2: Throw error (dùng try-catch)
        try {
            const result = await mutateUnWrap(formData);
            console.log("User created:", result);
        } catch (err) {
            console.log("Error caught:", err);
        }
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSubmit({ name: "John", email: "john@example.com" });
            }}
        >
            {isLoading && <span>Creating...</span>}
            {error && <span style={{ color: "red" }}>{error.message}</span>}
            <button type="submit" disabled={isLoading}>
                Create User
            </button>
        </form>
    );
}
```

### Naming Convention

```typescript
// Mutation với name = "create"
const {
    create, // Action mặc định
    createUnWrap, // Action với unwrap
    result,
    error,
    isLoading,
} = useMutationHandler(useCreateUserMutation, "create");

// Mutation với name = "updateProfile"
const { updateProfile, updateProfileUnWrap, result, error, isLoading } =
    useMutationHandler(useUpdateUserMutation, "updateProfile");
```

### Pattern: Form Submission

```typescript
const handleFormSubmit = async (formData: FormPayload) => {
    try {
        const result = await mutateUnWrap(formData);

        // Success
        toast.success("Updated successfully!");
        // Có thể redirect, close modal, etc.
    } catch (err) {
        // Error đã được catch, state.error tự động update
        // UI sẽ re-render với error message
        toast.error(error?.message || "Something went wrong");
    }
};
```

---

## useKeyboardNavigation Hook

### Mục Đích

Tạo keyboard shortcuts cho UI (mũi tên, Enter, Delete, Escape).

### Cách Sử Dụng

```typescript
"use client";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

export default function EmailList() {
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [selectedEmail, setSelectedEmail] = useState(null);

    // Setup keyboard shortcuts
    useKeyboardNavigation({
        // Mũi tên lên - di chuyển focus lên
        onArrowUp: () => {
            setFocusedIndex((prev) => Math.max(0, prev - 1));
        },

        // Mũi tên xuống - di chuyển focus xuống
        onArrowDown: () => {
            setFocusedIndex((prev) => Math.min(emails.length - 1, prev + 1));
        },

        // Enter - chọn email hiện tại
        onEnter: () => {
            if (focusedIndex >= 0) {
                setSelectedEmail(emails[focusedIndex]);
            }
        },

        // Delete - xóa email hiện tại
        onDelete: () => {
            if (focusedIndex >= 0) {
                deleteEmail(emails[focusedIndex].id);
            }
        },

        // Escape - clear focus
        onEscape: () => {
            setFocusedIndex(-1);
        },

        // Bật/tắt keyboard shortcuts
        enabled: true, // hoặc: !isModalOpen
    });

    return (
        <div data-email-list>
            {emails.map((email, idx) => (
                <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    style={{
                        backgroundColor:
                            focusedIndex === idx ? "blue" : "transparent",
                    }}
                >
                    {email.subject}
                </div>
            ))}
        </div>
    );
}
```

### Attributes

```typescript
interface KeyboardNavigationOptions {
    onArrowUp?: () => void; // Khi nhấn mũi tên lên
    onArrowDown?: () => void; // Khi nhấn mũi tên xuống
    onEnter?: () => void; // Khi nhấn Enter
    onDelete?: () => void; // Khi nhấn Delete/Backspace
    onEscape?: () => void; // Khi nhấn Escape
    enabled?: boolean; // Default: true
}
```

### Tips

- Hook này **ngăn chặn default browser behavior** cho các key được xử lý
- Dùng `data-email-list` attribute để xác định element nào được focus
- Combine với hover styles để tạo visual feedback

---

## useInput Hook

### Mục Đích

Quản lý state của input field với error tracking.

### Cách Sử Dụng

```typescript
"use client";
import useInput from "@/hooks/useInput";

export default function LoginForm() {
    // [value, setValue, error, setError]
    const [email, setEmail, emailError, setEmailError] = useInput(""); // Default value: ""

    const [password, setPassword, pwdError, setPwdError] = useInput();

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);

        // Validate email
        if (!value.includes("@")) {
            setEmailError("Invalid email");
        } else {
            setEmailError("");
        }
    };

    return (
        <div>
            <input
                value={email}
                onChange={handleEmailChange}
                placeholder="Email"
            />
            {emailError && <span style={{ color: "red" }}>{emailError}</span>}

            <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
            />
            {pwdError && <span style={{ color: "red" }}>{pwdError}</span>}
        </div>
    );
}
```

### Type

```typescript
type InputHookReturn = [
    string, // value
    (value: string) => void, // setValue
    string, // error
    (error: string) => void // setError
];
```

---

## Các Pattern & Best Practices

### Pattern 1: Query + Refetch

```typescript
const {
    result: user,
    refetch,
    isLoading,
} = useQueryHandler(useGetUserQuery, userId);

// Refetch khi user click button
const handleRefresh = async () => {
    await refetch();
};

// Hoặc: dependency change tự động refetch
useEffect(() => {
    refetch();
}, [userId, refetch]);
```

### Pattern 2: Mutation sau Query

```typescript
const { result: users } = useQueryHandler(useGetUsersQuery, undefined);
const {
    update,
    result: updatedUser,
    error,
} = useMutationHandler(useUpdateUserMutation, "update");

const handleUpdate = async (userId: string, data: UpdatePayload) => {
    const result = await update({ id: userId, data });
    if (result) {
        // Có thể refetch list nếu cần
        console.log("Updated:", result);
    }
};
```

### Pattern 3: Skip Query Conditionally

```typescript
const [userId, setUserId] = useState<string | null>(null);

// Query sẽ bỏ qua nếu userId null
const { result: user } = useQueryHandler(
    useGetUserQuery,
    userId!, // Type assertion
    { skip: !userId } // Skip nếu undefined
);
```

### Pattern 4: Polling/Refetch Interval

```typescript
const { refetch } = useQueryHandler(useGetUserQuery, undefined);

useEffect(() => {
    // Refetch mỗi 30 giây
    const interval = setInterval(() => {
        refetch();
    }, 30 * 1000);

    return () => clearInterval(interval);
}, [refetch]);
```

### Pattern 5: Cache Invalidation

Trong API definition:

```typescript
invalidatesTags: (result) => {
    // Invalidate khi mutation thành công
    return ["User"]; // "User" tag sẽ bị re-fetch
};

providesTags: ["User"], // Query này provide "User" tag
```

Sau khi mutation thành công, tất cả queries với tag `["User"]` sẽ tự động refetch.

---

## useEffect & Data Subscription

### Khi Nào Dùng useEffect

```typescript
import { useEffect } from "react";
import { useQueryHandler } from "@/hooks/useQueryHandler";

export default function UserPage() {
    const [userId, setUserId] = useState("123");

    // Pattern 1: Re-fetch khi dependency thay đổi
    const { result: user, refetch } = useQueryHandler(useGetUserQuery, userId);

    useEffect(() => {
        // Khi userId thay đổi, refetch tự động (từ hook)
        // Nhưng nếu cần logic thêm:
        if (user) {
            console.log("User loaded:", user.name);
        }
    }, [user, userId]);

    // Pattern 2: Setup subscription
    useEffect(() => {
        const handleStorageChange = () => {
            refetch();
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [refetch]);

    // Pattern 3: Cleanup
    useEffect(() => {
        return () => {
            // Cleanup khi component unmount
            console.log("Cleanup");
        };
    }, []);

    return <div>{user?.name}</div>;
}
```

### Tránh Race Condition

```typescript
useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        const result = await refetch();
        if (isMounted) {
            // Chỉ update state nếu component còn mount
            console.log(result);
        }
    };

    fetchData();

    return () => {
        isMounted = false; // Cleanup
    };
}, [dependency]);
```

---

## Error Handling

### Error Format

Tất cả error từ `useQueryHandler` và `useMutationHandler` đều normalize thành:

```typescript
{
    error: string | null,   // Error code (VD: "INVALID_EMAIL")
    message: string | null  // Error message (VD: "Email không hợp lệ")
}
```

### Error Handling Patterns

```typescript
"use client";
import { useMutationHandler } from "@/hooks/useMutationHandler";

export default function CreateUserForm() {
    const { mutate, error, isLoading } = useMutationHandler(
        useCreateUserMutation,
        "create"
    );

    // Pattern 1: Display error message
    return (
        <div>
            {error && (
                <div style={{ color: "red" }}>
                    <p>Code: {error.error}</p>
                    <p>Message: {error.message}</p>
                </div>
            )}
        </div>
    );

    // Pattern 2: Handle specific error
    const handleSpecificError = (error: any) => {
        if (error?.error === "EMAIL_ALREADY_EXISTS") {
            return "Email này đã được sử dụng";
        }
        if (error?.error === "INVALID_EMAIL") {
            return "Email không hợp lệ";
        }
        return error?.message || "Có lỗi xảy ra";
    };

    // Pattern 3: Toast notification
    useEffect(() => {
        if (error) {
            toast.error(error.message);
        }
    }, [error]);
}
```

### Error Types

```typescript
interface ErrorResponse {
    errorCode: string; // VD: "VALIDATION_ERROR"
    message: string; // VD: "Invalid input"
    details?: Record<string, any>;
}
```

---

## Caching & Tag Invalidation

### Setup Tags

Trong `services/index.ts`:

```typescript
export const api = createApi({
    baseQuery: baseQueryWithInterceptors,
    tagTypes: ["User", "Auth", "Emails", "Profile"], // Define tags
    keepUnusedDataFor: 60, // Cache 60 giây
    endpoints: () => ({}),
});
```

### Provide Tags (Queries)

```typescript
export const userApi = api.injectEndpoints({
    endpoints: (build) => ({
        getUser: build.query<SuccessResponse<User>, void>({
            query: () => ({...}),
            providesTags: ["User"], // Query này cung cấp "User" tag
        }),

        getUsers: build.query<SuccessResponse<User[]>, void>({
            query: () => ({...}),
            providesTags: (result) => {
                // Dynamic tags based on result
                return result?.data
                    ? [...result.data.map((u) => ({ type: "User" as const, id: u.id }))]
                    : ["User"];
            },
        }),
    }),
});
```

### Invalidate Tags (Mutations)

```typescript
updateUser: build.mutation<SuccessResponse<User>, UpdatePayload>({
    query: (payload) => ({...}),
    invalidatesTags: (result, error, arg) => {
        // Re-fetch tất cả "User" tags khi mutation thành công
        return ["User"];

        // Hoặc: Invalidate specific user
        // return [{ type: "User" as const, id: arg.id }];
    },
}),
```

### Cache Behavior

```typescript
// Cache này giữ data 60 giây (keepUnusedDataFor)
const { result: user1 } = useQueryHandler(useGetUserQuery, userId);

// Quay lại sau 30 giây
// → Dùng cache (không refetch)

// Quay lại sau 70 giây
// → Cache hết hạn, refetch từ server

// Mutation thành công
// → Tất cả "User" queries bị invalidate, refetch lần sau
```

---

## Quick Reference

### Import Statements

```typescript
// Hooks
import useInput from "@/hooks/useInput";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

// Redux
import { useSelector } from "@/store";
import { useDispatch } from "@/store";

// APIs
import { useGetUserQuery } from "@/services/User";
import { useCreateUserMutation } from "@/services/User";
```

### Common Operations

```typescript
// 1. Fetch data
const { result, error, isLoading, refetch } = useQueryHandler(
    useGetUserQuery,
    userId
);

// 2. Create/Update
const { create, result, error, isLoading } = useMutationHandler(
    useCreateUserMutation,
    "create"
);

// 3. Form input
const [name, setName, nameError, setNameError] = useInput("");

// 4. Keyboard nav
useKeyboardNavigation({
    onArrowUp: handleUp,
    onArrowDown: handleDown,
    onEnter: handleSelect,
});

// 5. Refetch
useEffect(() => {
    refetch();
}, [dependency]);

// 6. Error display
{
    error && <span>{error.message}</span>;
}
```

---

## Troubleshooting

### Issue: Data không update sau mutation

**Giải pháp**: Thêm `invalidatesTags` trong mutation:

```typescript
updateUser: build.mutation({
    query: (payload) => ({...}),
    invalidatesTags: ["User"], // ← Thêm dòng này
}),
```

### Issue: Multiple queries cùng refetch

**Giải pháp**: Dùng `skip` option:

```typescript
const { result } = useQueryHandler(
    useGetUsersQuery,
    userId,
    { skip: !userId } // Không query nếu userId empty
);
```

### Issue: Error không hiển thị

**Giải pháp**: Check error format:

```typescript
// ✓ Đúng
if (error?.error || error?.message) { ... }

// ✗ Sai
if (error) { ... } // error là object, luôn truthy
```

### Issue: Component re-render quá nhiều

**Giải pháp**: Dùng `useMemo` hoặc `useCallback`:

```typescript
const handleSubmit = useCallback(
    async (data) => {
        await mutate(data);
    },
    [mutate]
);
```

---

## Resources

- [RTK Query Docs](https://redux-toolkit.js.org/rtk-query/overview)
- [React Hooks](https://react.dev/reference/react)
- Project structure: `/services`, `/hooks`, `/store`

---

**Last Updated**: November 25, 2025

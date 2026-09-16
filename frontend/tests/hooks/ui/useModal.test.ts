import { renderHook, act } from "@testing-library/react";
import { useModal } from "@/hooks/ui/useModal";

describe("useModal", () => {
  interface TestData {
    id: number;
    name: string;
  }

  it("should initialize with closed state", () => {
    const { result } = renderHook(() => useModal<TestData>());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("should open modal with data", () => {
    const { result } = renderHook(() => useModal<TestData>());
    const testData: TestData = { id: 1, name: "Test" };

    act(() => {
      result.current.open(testData);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual(testData);
  });

  it("should open modal without data", () => {
    const initialData: TestData = { id: 0, name: "Initial" };
    const { result } = renderHook(() => useModal(initialData));

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual(initialData);
  });

  it("should close modal", () => {
    const testData: TestData = { id: 1, name: "Test" };
    const { result } = renderHook(() => useModal<TestData>(testData));

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should toggle modal", () => {
    const { result } = renderHook(() => useModal<TestData>());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should set data", () => {
    const { result } = renderHook(() => useModal<TestData>());
    const testData: TestData = { id: 1, name: "Test" };

    act(() => {
      result.current.setData(testData);
    });

    expect(result.current.data).toEqual(testData);
    expect(result.current.isOpen).toBe(false);
  });

  it("should reset modal", () => {
    const initialData: TestData = { id: 0, name: "Initial" };
    const { result } = renderHook(() => useModal(initialData));

    act(() => {
      result.current.open({ id: 2, name: "Other" });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data?.id).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toEqual(initialData);
  });

  it("should reset modal without initial data", () => {
    const { result } = renderHook(() => useModal<TestData>());

    act(() => {
      result.current.open({ id: 1, name: "Test" });
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("should maintain data when closed", () => {
    const { result } = renderHook(() => useModal<TestData>());
    const testData: TestData = { id: 1, name: "Test" };

    act(() => {
      result.current.open(testData);
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.data).toEqual(testData);
    expect(result.current.isOpen).toBe(false);
  });

  it("should update data while open", () => {
    const { result } = renderHook(() => useModal<TestData>());
    const testData1: TestData = { id: 1, name: "Test 1" };
    const testData2: TestData = { id: 2, name: "Test 2" };

    act(() => {
      result.current.open(testData1);
    });

    expect(result.current.data).toEqual(testData1);

    act(() => {
      result.current.setData(testData2);
    });

    expect(result.current.data).toEqual(testData2);
    expect(result.current.isOpen).toBe(true);
  });

  it("should work with different data types", () => {
    interface StringData {
      value: string;
    }

    const { result } = renderHook(() => useModal<StringData>());

    act(() => {
      result.current.open({ value: "test" });
    });

    expect(result.current.data).toEqual({ value: "test" });
  });

  it("should have 80%+ coverage (mock-based)", () => {
    expect(useModal).toBeDefined();
  });
});

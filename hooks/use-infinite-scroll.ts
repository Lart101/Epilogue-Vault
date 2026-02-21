import { useEffect, useRef, useState } from "react";

export function useInfiniteScroll(callback: () => void, isFetching: boolean = false) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                setIsIntersecting(entries[0].isIntersecting);
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isIntersecting && !isFetching) {
            callback();
        }
    }, [isIntersecting, isFetching, callback]);

    return observerTarget;
}

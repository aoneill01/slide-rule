import { MouseEvent, MouseEventHandler, useCallback, useEffect, useRef, useState } from "react";
import "./SlideRule.css";

type Point = {
  x: number;
  y: number;
};

type DragState = {
  dragging: boolean;
  start: Point | null;
  position: any;
  mode: string | null;
};

type WithClientPosition = {
  clientX: number;
  clientY: number;
};

const initViewBox = {
  x: -10,
  y: 0,
  w: 120,
  h: 80,
};

export default function SlideRule() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState(initViewBox);
  const [slideOffset, setSlideOffset] = useState(0);
  const [cursorOffset, setCursorOffset] = useState(50);
  const dragState = useRef<DragState>({
    dragging: false,
    start: null,
    position: null,
    mode: null,
  });
  const ab = useCallback(abScale, []);
  const cd = useCallback(cdScale, []);

  const localPoint = (event: WithClientPosition) => {
    var pt = svgRef.current!.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    return pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
  };

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const scale = event.deltaY < 0 ? 1.15 : 1 / 1.15;
      const transformed = localPoint(event);
      setViewBox((current) => {
        const w = Math.min(initViewBox.w, current.w / scale);
        const h = Math.min(initViewBox.h, current.h / scale);
        const idealX = current.x + (transformed.x - current.x) * (1 - 1 / scale);
        const idealY = current.y + (transformed.y - current.y) * (1 - 1 / scale);
        return {
          w,
          h,
          x: clip(idealX, initViewBox.x, initViewBox.x + initViewBox.w - w),
          y: clip(idealY, initViewBox.y, initViewBox.y + initViewBox.h - h),
        };
      });
    };

    // Assume that svg ref always exists and doesn't change.
    const svg = svgRef.current!;
    // React doesn't use `passive: false`, so we can't use `onWheel`
    svg.addEventListener("wheel", handleWheel, { passive: false });

    return () => svg.removeEventListener("wheel", handleWheel);
  }, []);

  const handleStartDrag = (event: MouseEvent<SVGSVGElement>) => {
    if (!event.target || !(event.target instanceof Element)) return;

    if (event.target.classList.contains("slide")) {
      dragState.current.mode = "slide";
      dragState.current.position = slideOffset;
    } else if (event.target.classList.contains("cursor")) {
      dragState.current.mode = "cursor";
      dragState.current.position = cursorOffset;
    } else {
      dragState.current.mode = "body";
      dragState.current.position = viewBox;
    }
    dragState.current.start = localPoint(event);
    dragState.current.dragging = true;
  };

  const handleDrag = (event: MouseEvent<SVGSVGElement>) => {
    if (!dragState.current.dragging) return;

    const pointer = localPoint(event);

    if (dragState.current.mode === "slide") {
      setSlideOffset(clip(dragState.current.position + pointer.x - dragState.current.start!.x, -100, 100));
    } else if (dragState.current.mode === "cursor") {
      setCursorOffset(clip(dragState.current.position + pointer.x - dragState.current.start!.x, 0, 100));
    } else if (dragState.current.mode === "body") {
      const idealX =
        dragState.current.position.x -
        (pointer.x + (dragState.current.position.x - viewBox.x) - dragState.current.start!.x);
      const idealY =
        dragState.current.position.y -
        (pointer.y + (dragState.current.position.y - viewBox.y) - dragState.current.start!.y);
      setViewBox({
        ...dragState.current.position,
        x: clip(idealX, initViewBox.x, initViewBox.x + initViewBox.w - dragState.current.position.w),
        y: clip(idealY, initViewBox.y, initViewBox.y + initViewBox.h - dragState.current.position.h),
      });
    }
  };

  const handleStopDrag = (event: MouseEvent<SVGSVGElement>) => {
    handleDrag(event);
    dragState.current.dragging = false;
    dragState.current.mode = null;
  };

  return (
    <svg
      onMouseDown={handleStartDrag}
      onMouseMove={handleDrag}
      onMouseUp={handleStopDrag}
      onMouseLeave={handleStopDrag}
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      width="100%"
    >
      <g transform={`translate(${slideOffset} 0)`}>
        <rect className="slide" rx="1" ry="1" x="-8" y="35" width="116" height="10" fill="#F7C88C" />
        <g className="no-pointer-events">
          <text x="-2" y="37.7" className="label-major">
            B
          </text>
          <text x="-2" y="43.5" className="label-major">
            C
          </text>
          {cd().map((props, i) => (
            <Mark {...props} y={45} flipped key={i} />
          ))}
          {ab().map((props, i) => (
            <Mark {...props} y={35} key={i} />
          ))}
        </g>
      </g>

      <rect x="-3" y="25" width="106" height="10" fill="#FCDDB5" />
      <g className="no-pointer-events">
        <text x="-2" y="33.5" className="label-major">
          A
        </text>
        {ab().map((props, i) => (
          <Mark {...props} y={35} flipped key={i} />
        ))}
      </g>

      <rect x="-3" y="45" width="106" height="10" fill="#FCDDB5" />
      <g className="no-pointer-events">
        <text x="-2" y="47.7" className="label-major">
          D
        </text>
        {cd().map((props, i) => (
          <Mark {...props} y={45} key={i} />
        ))}
      </g>

      <path d="M -3 25 v 30 h -4 a 1 1 0 0 1 -1 -1 v -8 a 7 7 1 0 0 0 -12 v -8 a 1 1 0 0 1 1 -1 Z" fill="silver" />
      <path d="M 103 25 v 30 h 4 a 1 1 0 0 0 1 -1 v -8 a 7 7 1 0 1 0 -12 v -8 a 1 1 0 0 0 -1 -1 Z" fill="silver" />

      <g transform={`translate(${cursorOffset} 0)`}>
        <line x1="0" y1="25" x2="0" y2="55" stroke="red" strokeWidth=".08" />
        <rect
          className="cursor"
          x="-5"
          y="24.75"
          width="10"
          height="30.5"
          fill="#FFFFFF44"
          stroke="silver"
          strokeWidth=".5"
        />
      </g>
    </svg>
  );
}

interface MarkProps {
  type: string;
  value: number;
  label?: string | number;
  y: number;
  flipped?: boolean;
}

function Mark({ type, value, label, y, flipped = false }: MarkProps) {
  const length = () => {
    const sign = flipped ? -1 : 1;
    switch (type) {
      case "primary":
        return sign * 1.25;
      case "secondary":
        return sign * 1.5;
      case "tertiary":
        return sign * 1;
      default:
        return sign * 0.5;
    }
  };
  if (!label) {
    return <line x1={100 * value} y1={y} x2={100 * value} y2={y + length()} stroke="black" strokeWidth=".08" />;
  } else {
    return (
      <g>
        <line x1={100 * value} y1={y} x2={100 * value} y2={y + length()} stroke="black" strokeWidth=".08" />
        {type === "primary" ? (
          <text x={100 * value} y={y + (flipped ? -1.5 : 2.7)} textAnchor="middle" className="label-major">
            {label}
          </text>
        ) : (
          <text x={100 * value + 0.1} y={y + (flipped ? -1.5 : 2.3)} textAnchor="left" className="label-minor">
            {label}
          </text>
        )}
      </g>
    );
  }
}

function cdScale() {
  const marks = [];

  for (let i = 1; i <= 10; i++) {
    marks.push({
      type: "primary",
      value: Math.log10(i),
      label: i === 10 ? 1 : i,
    });

    switch (i) {
      case 1: {
        for (let j = 1; j < 100; j++) {
          const value = Math.log10(1 + 0.01 * j);
          if (j % 10 === 0) {
            marks.push({
              type: "secondary",
              value,
              label: j / 10,
            });
          } else if (j % 5 === 0) {
            marks.push({
              type: "tertiary",
              value,
            });
          } else {
            marks.push({
              type: "quarternary",
              value,
            });
          }
        }
        break;
      }
      case 2:
      case 3: {
        for (let j = 1; j < 50; j++) {
          const value = Math.log10(i + 0.02 * j);
          if (j % 25 === 0) {
            marks.push({
              type: "secondary",
              value,
            });
          } else if (j % 5 === 0) {
            marks.push({
              type: "tertiary",
              value,
            });
          } else {
            marks.push({
              type: "quarternary",
              value,
            });
          }
        }
        break;
      }
      case 10:
        break;
      default: {
        for (let j = 1; j < 20; j++) {
          const value = Math.log10(i + 0.05 * j);
          if (j % 10 === 0) {
            marks.push({
              type: "secondary",
              value,
            });
          } else if (j % 2 === 0) {
            marks.push({
              type: "tertiary",
              value,
            });
          } else {
            marks.push({
              type: "quarternary",
              value,
            });
          }
        }
        break;
      }
    }
  }

  marks.push({
    type: "secondary",
    value: Math.log10(Math.PI),
    label: "π",
  });

  return marks;
}

function abScale() {
  const marks = [];

  for (let i = 1; i <= 10; i++) {
    marks.push({
      type: "primary",
      value: Math.log10(Math.sqrt(i)),
      label: i === 10 ? 1 : i,
    });

    if (i !== 1) {
      marks.push({
        type: "primary",
        value: Math.log10(Math.sqrt(10 * i)),
        label: i === 10 ? 1 : i,
      });
    }

    switch (i) {
      case 1: {
        for (let j = 1; j < 50; j++) {
          const value = Math.log10(Math.sqrt(1 + 0.02 * j));
          const value2 = Math.log10(Math.sqrt(10 * (1 + 0.02 * j)));
          if (j % 25 === 0) {
            marks.push({
              type: "secondary",
              value,
            });
            marks.push({
              type: "secondary",
              value: value2,
            });
          } else if (j % 5 === 0) {
            marks.push({
              type: "tertiary",
              value,
            });
            marks.push({
              type: "tertiary",
              value: value2,
            });
          } else {
            marks.push({
              type: "quarternary",
              value,
            });
            marks.push({
              type: "quarternary",
              value: value2,
            });
          }
        }
        break;
      }
      case 2:
      case 3:
      case 4: {
        for (let j = 1; j < 20; j++) {
          const value = Math.log10(Math.sqrt(i + 0.05 * j));
          const value2 = Math.log10(Math.sqrt(10 * (i + 0.05 * j)));
          if (j % 10 === 0) {
            marks.push({
              type: "secondary",
              value,
            });
            marks.push({
              type: "secondary",
              value: value2,
            });
          } else if (j % 2 === 0) {
            marks.push({
              type: "tertiary",
              value,
            });
            marks.push({
              type: "tertiary",
              value: value2,
            });
          } else {
            marks.push({
              type: "quarternary",
              value,
            });
            marks.push({
              type: "quarternary",
              value: value2,
            });
          }
        }
        break;
      }
      case 10:
        break;
      default: {
        for (let j = 1; j < 20; j++) {
          const value = Math.log10(Math.sqrt(i + 0.05 * j));
          const value2 = Math.log10(Math.sqrt(10 * (i + 0.05 * j)));
          if (j % 10 === 0) {
            marks.push({
              type: "secondary",
              value,
            });
            marks.push({
              type: "secondary",
              value: value2,
            });
          } else if (j % 2 === 0) {
            marks.push({
              type: "tertiary",
              value,
            });
            marks.push({
              type: "tertiary",
              value: value2,
            });
          }
        }
        break;
      }
    }
  }

  return marks;
}

function clip(input: number, min: number, max: number) {
  return Math.min(Math.max(input, min), max);
}

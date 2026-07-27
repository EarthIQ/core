// import { onCLS, onFID, onLCP, onFCP, onTTFB } from "web-vitals";
import { onCLS, onLCP, onFCP, onTTFB } from "web-vitals";

type Metric = {
  name: string;
  value: number;
  id: string;
};

function sendToAnalytics(metric: Metric) {
  // Send to your analytics service
  console.log(metric);

  // Example: Send to Google Analytics
  // gtag('event', metric.name, {
  //   value: Math.round(metric.value),
  //   metric_id: metric.id,
  // });
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  //   onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

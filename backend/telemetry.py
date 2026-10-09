"""Optional OTLP tracing. Export metadata only, never briefs, prompts or keys."""
import os
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

_provider=None

def tracer():
    global _provider
    if _provider is None:
        _provider=TracerProvider(resource=Resource.create({'service.name':'vacanes-worker'}))
        if os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT') or os.getenv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'):
            _provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    return _provider.get_tracer('vacanes.studio')

def step_span(job,node):
    context=trace.SpanContext(trace_id=int(job['id'].replace('-',''),16),span_id=1,is_remote=False,trace_flags=trace.TraceFlags(1))
    return tracer().start_as_current_span('workflow.'+node['kind'],context=trace.set_span_in_context(trace.NonRecordingSpan(context)),attributes={'workflow.id':job['id'],'workflow.node':node['id'],'workflow.attempt':job['payload']['attempts']},record_exception=False,set_status_on_exception=False)

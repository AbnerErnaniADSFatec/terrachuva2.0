SELECT 
monthly.nome_municipio as nome_municipio,
monthly.maxima as maxima_ano,
merge_monthly.maxima as maxima,
(monthly.maxima - merge_monthly.maxima) as var_maxima,
monthly.media as media_ano,
merge_monthly.media as media,
(monthly.media - merge_monthly.media) as var_media,
monthly.ano as ano,
merge_monthly.mes as mes,
monthly.mes || '/' || monthly.ano as format_date
FROM public.an_municip_monthly_dynamic monthly, public.an_municip_monthly merge_monthly
WHERE TO_DATE('{mes_inicio}/{ano_inicio}','MM/YYYY') <= monthly.execution_date
AND monthly.execution_date <= TO_DATE('{mes_fim}/{ano_fim}','MM/YYYY')
AND monthly.geocodigo = '{geocodigo}'
AND monthly.geocodigo = merge_monthly.geocodigo
AND monthly.mes = merge_monthly.mes
AND monthly.media IS NOT NULL AND monthly.maxima IS NOT NULL
AND merge_monthly.media IS NOT NULL AND merge_monthly.maxima IS NOT NULL
ORDER BY monthly.execution_date;
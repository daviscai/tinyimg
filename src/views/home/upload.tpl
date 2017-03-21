{% set path = "app/views/" %}
{% extends path + "layout/layout.tpl" %}


<!--body block-->
{% block body %}
<!-- enctype="multipart/form-data" -->
<form action="/upload" method="post" enctype="multipart/form-data" >
    <input type="hidden" name="_csrf" value="{{ csrf }}" />
    <input type="text" name="bno" />
    <input type="file" name="image" />
    <input type="file" name="image1" />
    <input type="submit" value="Upload" />
</form>


{% endblock %}

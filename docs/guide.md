### Coding Guide

This guide is a WIP. The most important point right now is:

Before adding any new function, scan the repository for another function with the same name. 
We must avoid duplicate names because the entire app is not module based and everything is loaded in `<script>` tags
in index.html. So we cannot have conflicts.